# TicketHub - Event Ticketing System Design

## 1. Context
Problem: Fans miss concerts because ticketing sites crash on big sales, and double-booking creates unfairness.
For: 2M registered users and event organizers.
TicketHub is like Ticketmaster for assigned seats.

## 2. Goals and Non-Goals
Goals: Browse events, view seat map, hold seat for 10 min, pay and get ticket, view my orders. Prevent double-booking. Handle flash sale fairly.
Non-Goals: Dynamic pricing, resale marketplace, recommendation algorithm.

## 3. Requirements and Estimates

Functional: register/login, list/search events, view seats (available/held/sold), hold seat, pay, view tickets, create event.

Non-Functional: Speed <200ms browse, <500ms hold. Correctness: never sell same seat twice. Fairness: rate limiting. Availability 99.9%. Scalability 200k/10min.

Estimates:
Normal: 50k visitors * 10 pages = 500k views/day. 500k/43200s (12h) = ~12 req/s read. 5k tickets/day = 0.06 write/s. Storage trivial.
Peak: 200k people for 20k seats in 10 min = 200k/600s = 333 req/s sustained, peak 1000+ req/s. 28x read spike, 5000x write spike. Only 10% succeed. Contention on same 20k rows.
Conclusion: Not storage bound, it's contention and write-concurrency bound. Need queue, cache, ACID.

## 4. Proposed Design

### API - 6 REST endpoints

1. GET /api/events?city=Kampala&date=2026-11-01 -> 200 {events: [{id,name,venue,date,available_seats}]}
2. GET /api/events/:eventId/seats -> 200 {seats: [{seat_id,row,number,status,price}]} from Redis cache, fallback to read replica
3. POST /api/events/:eventId/hold Body: {seat_id} -> 201 {hold_id, expires_at}, 409 Conflict if taken, 429 rate limited
4. POST /api/orders/:holdId/pay Body: {payment_method} -> 201 {order_id, ticket_qr}, 410 Gone if hold expired
5. GET /api/users/me/orders -> 200 orders list, JWT required
6. POST /api/events Body: {name,venue,date,total_seats} -> 201 Created organizer

### Data Model - Postgres

users: id PK UUID, email UNIQUE, password_hash, created_at. Index email.
events: id PK, organizer_id FK users, name, venue, event_date, total_seats, poster_url S3, created_at
seats: id PK, event_id FK events, row_label, seat_number, price, status ENUM(available,held,sold), held_until TIMESTAMP, held_by_user_id FK. UNIQUE(event_id,row_label,seat_number). Index event_id,status
orders: id PK, user_id FK, event_id FK, seat_id FK UNIQUE, status ENUM(pending,paid,cancelled), amount, created_at. UNIQUE seat_id is core guarantee. Index user_id.

### How Double-Booking is Prevented

3 layers, DB is final truth:
1. Redis fast path: SET seat:{event}:{seatId} NX EX 600. If fails return 409 immediately.
2. Postgres transaction: BEGIN; SELECT * FROM seats WHERE id=$1 AND status='available' FOR UPDATE; -- row-lock blocks others. UPDATE seats SET status='held', held_by_user_id=$2, held_until=NOW()+10min WHERE id=$1; COMMIT;
3. Unique constraint on orders.seat_id: INSERT will fail duplicate key even if app bug.
4. Expiration job: cron every 1 min releases held_until < NOW().

## 5. Architecture - How it Survives Big Sale

Diagram: architecture.png

Written breakdown:
- CDN + WAF CloudFront: serves posters from S3, caches event list. Offloads 80% reads.
- Load Balancer + Rate Limiter: Stateless. Token bucket 5 holds/min per user. Prevents bot overload. Essential because app servers are stateless behind LB - any server can handle any request, no session stored locally.
- Virtual Waiting Room / Queue: When waiting >50k, new users get queue position. Lets in 500 per 30 sec. Turns 200k spike into controlled flow. This is key to survival - without it DB gets 200k concurrent FOR UPDATE locks -> deadlocks.
- Stateless API Servers Node.js/Express auto-scaled 2 to 20: Stateless allows horizontal scaling. Scale based on CPU and queue length.
- Redis Cache: seat maps cached 5 sec, holds locks, rate counters. 100x faster than DB. Problem caching introduces: stale seat map - mitigated with short TTL 5 sec and explicit invalidation on hold.
- Postgres Primary for writes + 2 Read Replicas for browsing: separates reads/writes. Browsing never hits primary.
- Payment Service Stripe webhook async: order marked paid only after confirmation.
- Object Storage S3: images not in DB, because storing blobs in DB bloats tables and slows backups. S3 is cheaper and CDN-friendly.
- Message Queue SQS: email tickets async, not in request path.
- Monitoring CloudWatch: monitors QPS, latency, DB locks.

When user types URL and presses Enter: DNS -> CDN -> WAF -> LB -> Waiting Room -> App Server -> Read Replica for events -> Cache -> response.

## 6. Alternatives and Trade-offs

Trade-off 1: Waiting Room Queue vs Pure FCFS
Alternative: Let all 200k hit DB directly.
Why not: DB deadlocks, 500 errors, 90% users see crash.
Chosen: Queue adds delay but keeps site up. Sacrifice instant access for availability. This is load shedding.

Trade-off 2: Strong Consistency Postgres vs Eventual Consistency NoSQL DynamoDB
Alternative: DynamoDB eventual consistency faster writes.
Why not: Risks overselling - two nodes think seat available.
Chosen: Postgres ACID + row-level lock. Sacrifice some throughput for correctness. Ticketing needs correctness > speed. Row-level lock vs table lock: table lock simpler but kills concurrency, we chose row-level per seat.

## 7. Risks and Open Questions

Risks: Redis failure -> fallback to DB slow. Payment success but order fail -> idempotent reconciliation. Bots -> CAPTCHA. Held not bought wastes inventory -> 5 min hold during peak.
Open: Hold duration peak vs normal? Max 4 seats per user for fairness? Shard by event_id if 1000 big events?
