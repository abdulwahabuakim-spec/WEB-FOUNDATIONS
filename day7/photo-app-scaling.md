# Day 7 Assignment: Scaling SnapShare Photo-Sharing App to 10M Users

## 1. Assumptions and Daily Active Users (DAU)

**Starting facts given by PLP:**
- 10 million registered users
- 10% active each day
- Each active user uploads 1 photo per day and views 50 feed pages per day
- Average photo is 2 MB, thumbnail is 50 KB

**Calculation:**
Daily Active Users = 10,000,000 * 10% = **1,000,000 DAU**

Assumptions:
- Photos are 2 MB JPEG, thumbnails 50 KB (2.05 MB total stored per upload)
- Day has 86,400 seconds
- Peak traffic is 5x average (evening hours)
- Feed page = 20 photos per page (metadata only, images from CDN/object storage)
- Users follow ~200 people average

## 2. Estimates: Uploads/sec, Feed Views/sec, Storage per Year

**Uploads per second:**
- Daily uploads = 1,000,000 * 1 = 1,000,000 photos/day
- Average = 1,000,000 / 86,400 = **11.6 uploads/sec (~12/sec)**
- Peak (5x) = 11.6 * 5 = **58 uploads/sec**

**Feed views per second:**
- Daily feed views = 1,000,000 * 50 = 50,000,000 feed page views/day
- Average = 50,000,000 / 86,400 = **578.7 views/sec (~579/sec)**
- Peak (5x) = 578.7 * 5 = **2,893.5 views/sec (~2,894/sec)**

**Photo Storage per Year:**
- Per day storage = 1M * 2 MB = 2 TB photos + 1M * 50 KB = 50 GB thumbnails = **2.05 TB/day**
- Per year = 2.05 TB * 365 = **748.25 TB/year (~0.75 PB/year)**
- 3 years = ~2.24 PB. Metadata (DB rows) ~150 bytes * 1M/day = 150 MB/day = 54 GB/year (tiny vs images).

## 3. Read-Heavy or Write-Heavy?

**System is READ-HEAVY.**

Ratio = 50 feed views : 1 upload = 50:1 reads to writes. For every write, we do 50 reads.

What it means for design: We optimize for reads. Use CDN to serve photos globally without hitting our servers, use cache (Redis) for feed lists, use read replicas for feed queries, and use object storage that scales reads infinitely. Writes can be slower (queue for thumbnails) because users tolerate 2-3 sec upload, but reads must be <200ms.

## 4. Why Photos Should NOT Be Stored Inside the Database

Photos should NOT be stored as BLOBs inside MySQL/Postgres because:
- DB becomes huge (748 TB/year), backups slow, replication lags, expensive.
- DB is designed for small rows and indexes, not for serving 2MB files - it would run out of RAM and connections.
- You cannot CDN-cache a DB BLOB easily.

**Instead:** Store photos in **Object Storage (like AWS S3, Cloudinary)** which is built for unlimited files, cheap, replicates across regions, and works directly with CDN. Database only stores metadata: `photo_id, user_id, s3_url, thumbnail_s3_url, created_at`.

## 5. Architecture Diagram (Text)
