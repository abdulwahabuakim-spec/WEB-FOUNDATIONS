# TicketHub - Event Ticketing System Design

## 1. Context - What problem and for whom?
**Problem:** Fans miss concerts because ticketing sites crash on big sales, and scalpers/double-booking creates unfairness.
**For whom:** 2 million registered users who browse events and buy assigned seats. Event organizers who list events.

TicketHub is a website like Ticketmaster that sells limited seats for concerts and events with fairness and no double-booking.

## 2. Goals and Non-Goals

**Goals:**
- Browse events, view seat map, hold a seat, pay, and get ticket
- Prevent two people from buying same seat (correctness is #1)
- Handle flash sale spike fairly
- Fast browsing on normal days

**Non-Goals:**
- Dynamic pricing / auction - fixed price only for MVP
- Resale marketplace - out of scope
- Seat recommendation algorithm - simple first-come first-served
- Live streaming - only ticket sales

## 3. Requirements and Estimates

**Functional Requirements:**
- Users can register/login, list events, search events
- Users can view seat map with status: available, held, sold
- Users can hold a seat for 10 minutes
- Users can pay and get ticket (QR code)
- Users can view their past orders
- Organizers can create events and seats

**Non-Functional Requirements:**
- **Speed:** Event browsing <200ms (cached), hold seat <500ms
- **Correctness:** Never sell same seat twice - strong consistency for orders
- **Fairness:** First-come first-served, no bot overload. Rate limiting per user.
- **Availability:** 99.9% on normal days, degrade gracefully on big sale
- **Scalability:** Must handle 200k users in 10 mins

**Estimates:**

**Normal Day:**
- 50,000 visitors * 10 pages = 500,000 page views / day
- Active hours 12h = 500k / 43,200s = ~12 req/s read
- 5,000 tickets sold / day = 5k writes / day = ~0.06 write/s - very low
- Storage: Events ~10k * 1KB = 10MB, Seats 20k per event average -> trivial

**Big Sale Peak:**
- 200,000 people try to buy 20,000 seats in 10 minutes
- Requests: 200k / 600s = 333 req/s sustained, peak likely 1000+ req/s at start
- Comparison: 333 req/s vs 12 req/s = **~28x read spike, ~5000x write spike**
- Only 10% will succeed (20k/200k), 90% will fail - need to handle failure gracefully
- Contention: All 200k fighting for same 20k rows -> DB lock bottleneck

Conclusion: System is NOT storage bound, it's **contention and write-concurrency bound**. We need queue, cache, and ACID transactions.

## 4. Proposed Design

### API - RESTful, at least 5 endpoints

**1. Browse events**
`GET /api/events?city=Kampala&date=2026-11-01`
- 200 OK + { events: [{id, name, venue, date, poster_url, available_seats}] }

**2. View seats for an event**
`GET /api/events/:eventId/seats`
- 200 OK + { seats: [{seat_id, row, number, status, price}] }
- Served from Redis cache, fallback to DB read replica

**3. Hold a seat (creates temporary lock)**
`POST /api/events/:eventId/hold`
Body: { seat_id }
- 201 Created { hold_id, expires_at: +10min } if success
- 409 Conflict { error: "Seat already held/sold" }
- 429 Too Many Requests if user rate limited

**4. Pay and confirm order**
`POST /api/orders/:holdId/pay`
Body: { payment_method_id }
- 201 Created { order_id, ticket_qr }
- 410 Gone { error: "Hold expired" }
- Uses DB transaction

**5. View my tickets**
`GET /api/users/me/orders`
- 200 OK + orders list
- Auth required: Bearer JWT

**6. (Bonus) Create event - organizer**
`POST /api/events`
Body: { name, venue, date, total_seats }
- 201 Created

### Data Model - 4+ tables, Postgres

**users**
- id (PK, UUID), email UNIQUE, password_hash, created_at
- Index on email

**events**
- id (PK), organizer_id FK->users, name, venue, event_date, total_seats, poster_url (S3), created_at

**seats**
- id (PK), event_id FK->events, row_label, seat_number, price, status ENUM('available','held','sold'), held_until TIMESTAMP, held_by_user_id FK
- CONSTRAINT UNIQUE(event_id, row_label, seat_number) - prevents duplicate seats
- Index on event_id, status

**orders**
- id (PK), user_id FK->users, event_id FK->events, seat_id FK->seats UNIQUE, status ENUM('pending','paid','cancelled'), amount, created_at
- UNIQUE constraint on seat_id -> **core guarantee: one seat can only be in one successful order ever**
- Index on user_id

**Relationships:** users 1-N orders, events 1-N seats, seats 1-1 orders, users 1-N events (as organizer)

### How Double-Booking is Prevented - Critical

We use **3 layers, database is final truth**:

1.  **Redis optimistic lock (fast path):** `SET seat:{eventId}:{seatId} NX EX 600` - Only one user can set. If fails, return 409 immediately. Reduces DB load.

2.  **Postgres ACID Transaction with SELECT FOR UPDATE:**
```sql
BEGIN;
SELECT * FROM seats WHERE id = $1 AND status = 'available' FOR UPDATE;
-- This row-lock blocks other transactions trying same seat
UPDATE seats SET status='held', held_by_user_id=$2, held_until=NOW()+INTERVAL '10 min' WHERE id=$1;
COMMIT;
