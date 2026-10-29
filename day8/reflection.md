
### 2. File: `day8/reflection.md`

```markdown
# Reflection - Day 8

The most difficult concept in this course for me was understanding why app servers must be stateless behind a load balancer and how caching introduces stale data. At first I thought storing user sessions on the server was simpler. I overcame it by drawing the flow: when a user is routed to Server A then next request to Server B, their cart disappears. I tested with two Express instances locally and reproduced the bug, then moved session to Redis and JWT. That hands-on test made statelessness click.

For caching, I struggled with invalidation. I learned the rule: cache seat maps for only 5 seconds during a sale, and never cache order status. I added Redis locks with short TTL.

Based on the feedback I received on my capstone (Two stars and a wish), my stars were clear API status codes and handling empty notes gracefully. My wish was to show the request in the Network tab and explain my architecture diagram box by box. In this TicketHub design I improved that: I explained every component from CDN to SQS and stated the reason behind each decision, and I used correct 201, 409, 429, 410 codes.

Next I want to learn a real backend with Node.js and Express and connect it to PostgreSQL, then learn React to build the seat map UI. I will follow the Node.js docs, MDN Express introduction, and react.dev Learn section as suggested, and practice on freeCodeCamp.

Word count: ~220
