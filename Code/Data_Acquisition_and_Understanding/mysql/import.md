
## Transfrom

```sql
CREATE TABLE `device` (
  `id` int(11) NOT NULL,
  `VirtualSensorCode` int(11) DEFAULT NULL,
  `DateTimeLocal` datetime DEFAULT NULL,
  `code_address` int(11) DEFAULT NULL,
  `Duration` float DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `Sensor` (`VirtualSensorCode`),
  KEY `device` (`DateTimeLocal`),
  KEY `sensor_time` (`code_address`,`DateTimeLocal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

## Insert

```sql
INSERT INTO device(id, VirtualSensorCode, DateTimeLocal, code_address, duration)
    SELECT id, VirtualSensorCode, DateTimeLocal, code_address, CAST(duration AS DOUBLE)
      FROM locatusdata_bewerkt
```

Duration: 20:11:50 - 20:24:00

```bash
ls -l /usr/local/var/mysql/ds_leeuwarden
total 8241376
-rw-rw----  1 clemens  admin          61 Jun  5 15:56 db.opt
-rw-rw----  1 clemens  admin        2039 Jun  5 20:10 device.frm
-rw-rw----  1 clemens  admin  2562719744 Jun  5 20:21 device.ibd
-rw-rw----  1 clemens  admin        1824 Jun  5 16:43 locatusdata_bewerkt.frm
-rw-rw----  1 clemens  admin  1635778560 Jun  5 16:44 locatusdata_bewerkt.ibd
-rw-rw----  1 clemens  admin        2027 Jun  5 19:47 sensor_gps.frm
-rw-rw----  1 clemens  admin       98304 Jun  5 19:47 sensor_gps.ibd
```

## Unique devices

```sql
SELECT code_address, count(code_address)
  FROM device 
  GROUP BY code_address
  ORDER BY count(code_address) DESC
```

```
code_address, count(code_address)
1368474	32432
159232	21991
493147	17488
985594	16239
983616	15000
55808	14617
1002504	14321
1370351	13381
94362	12293
1625491	11294
777621	11012
```

### 61440 devices > 99 keer gezien

```sql
SELECT count(*) FROM (
  SELECT code_address, count(code_address)
    FROM device 
    GROUP BY code_address
    HAVING count(code_address) > 99
    ORDER BY count(code_address) DESC
) MORE_99
```

### 1.762.000 < 100 keer gezien

```sql
SELECT count(*) FROM (
  SELECT code_address, count(code_address)
    FROM device 
    GROUP BY code_address
    HAVING count(code_address) < 100
    ORDER BY count(code_address) DESC
) LESS_100
```
1672368

## SensorByYear

```sql
DROP VIEW SensorByYear;
CREATE VIEW SensorByYear AS
/**
EXPLAIN
**/
SELECT counts.*, s.`longitude`, s.`latitude` FROM (
  SELECT VirtualSensorCode, YEAR(DateTimeLocal), count(VirtualSensorCode)
    FROM device d
    GROUP BY VirtualSensorCode, YEAR(DateTimeLocal)
  ) counts
 INNER JOIN sensor_gps s ON counts.VirtualSensorCode = s.sensor_id
```

## Nearest ping

### Check

```sql
/**
EXPLAIN
CREATE VIEW nearest_ping AS
**/
SELECT a.*, (
  SELECT id
    FROM device
   WHERE code_address = a.code_address AND DateTimeLocal > a.DateTimeLocal
   ORDER BY DateTimeLocal ASC
   LIMIT 1
  ) nearest_id, (SELECT DateTimeLocal FROM device WHERE id = nearest_id) NextDateTimeLocal, (SELECT code_address FROM device WHERE id = nearest_id) device_id
  FROM device a
  ORDER BY DateTimeLocal ASC
  LIMIT 10
```

### View

```sql
/**
EXPLAIN
**/
DROP VIEW  nearest_ping

CREATE VIEW nearest_ping AS
SELECT a.*, (
  SELECT id
    FROM device
   WHERE code_address = a.code_address AND DateTimeLocal > a.DateTimeLocal
   ORDER BY DateTimeLocal ASC
   LIMIT 1
  ) nearest_id, (SELECT DateTimeLocal FROM device WHERE id = nearest_id) NextDateTimeLocal, (SELECT VirtualSensorCode FROM device WHERE id = nearest_id) sensor_id
  FROM device a
  ORDER BY DateTimeLocal ASC
```

### Device Graph

```sql
SELECT
    `VirtualSensorCode` AS _from,
    `sensor_id` AS _to,
    DateTimeLocal,
    NextDateTimeLocal,
    NextDateTimeLocal - DateTimeLocal AS seconds
  FROM `nearest_ping`
  WHERE `sensor_id` IS NOT NULL
    AND NextDateTimeLocal - DateTimeLocal < 3600
 LIMIT 1000
 ```
