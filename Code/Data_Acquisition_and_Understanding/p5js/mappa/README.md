# Drawing on a map

## Run a webserver locally

Change into this project directory

```bash
cd ./Code/Data_Acquisition_and_Understanding/p5js/mappa
```

then start either a Python or PHP webserver.

```bash
python3 -m http.server 3000 
```

or

```
php -S 0.0.0.0:8000
```

## MySQL

```sql
SELECT DISTINCT code_address, count(*), min(DateTimeLocal) mn, max(DateTimeLocal) mx, (max(DateTimeLocal) - min(DateTimeLocal)) dt
  FROM device
 WHERE year = 2017
   AND month = 4
   AND day = 4
 GROUP BY code_address
 HAVING count(*) > 2
 ORDER BY count(*) DESC
 ```

 SELECT
   `VirtualSensorCode` sensor
  , code_address device
  , DateTimeLocal `timestamp`
  FROM device
 WHERE year = 2018
   AND month = 4
   AND code_address in (159232)

SELECT DISTINCT
    code_address device
  , VirtualSensorCode
  , count(*)
  , min(DateTimeLocal) mn
  , max(DateTimeLocal) mx
  , (max(DateTimeLocal) - min(DateTimeLocal)) dt
  FROM device
 WHERE year = 2017
   AND month = 4
   AND day = 4
 GROUP BY code_address, VirtualSensorCode
 HAVING 4 < count(*) AND count(*) < 70
 ORDER BY count(*) DESC
 