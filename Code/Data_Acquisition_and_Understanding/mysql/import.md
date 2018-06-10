
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
SELECT
    counts.*,
    /* FIX source table: lon / lat swapped ?!? */
    concat( 'POINT( ', s.latitude, ' ' ,s.longitude, ' )') AS point
  FROM (
    SELECT VirtualSensorCode AS sensor_id,
        YEAR(DateTimeLocal) AS Year,
        count(VirtualSensorCode) AS Aantal
      FROM device d
      GROUP BY VirtualSensorCode, YEAR(DateTimeLocal)
  ) counts
 INNER JOIN sensor_gps s ON counts.sensor_id = s.sensor_id
```

## SensorByYearMonth

```sql
DROP VIEW SensorByYearMonth;
CREATE VIEW SensorByYearMonth AS
/**
EXPLAIN
**/
SELECT counts.*, s.`longitude`, s.`latitude` FROM (
  SELECT VirtualSensorCode, DATE_FORMAT(DateTimeLocal, '%Y-%m') AS YearMonth, count(VirtualSensorCode) AS Aantal
    FROM device d
    GROUP BY VirtualSensorCode, DATE_FORMAT(DateTimeLocal, '%Y-%m')
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
SELECT g.id
     , g.`VirtualSensorCode` AS _from_sensor
     , g.`DateTimeLocal` AS _from_datetime
     , g.`code_address` AS _device_id
     , g.`Duration`AS _duration
     , g.year
     , g.month
     , g.day
     , d.`VirtualSensorCode` AS _next_sensor
     , d.`DateTimeLocal` AS _next_datetime
FROM
(
SELECT a.*, (SELECT id FROM device WHERE code_address = a.code_address AND DateTimeLocal > a.DateTimeLocal ORDER BY DateTimeLocal ASC LIMIT 1) next_id
  FROM device a
  ORDER BY DateTimeLocal ASC
) g
INNER JOIN device d on g.next_id = d.id
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

### Walk in the city

```sql
SELECT * FROM (
SELECT
    code_address AS device,
    `VirtualSensorCode` AS _from,
    `sensor_id` AS _to,
    DateTimeLocal,
    NextDateTimeLocal,
    NextDateTimeLocal - DateTimeLocal AS seconds
  FROM `nearest_ping`
  WHERE `sensor_id` IS NOT NULL
    /*
    AND code_address < 100000
    */
    AND code_address = 94055
    AND NextDateTimeLocal - DateTimeLocal < 36000
    AND VirtualSensorCode != sensor_id
 LIMIT 1000
 ) A
 ORDER BY DateTimeLocal
 ```


```sql
/**
EXPLAIN
/**/
SELECT
    DATE_FORMAT(DateTimeLocal, '%Y-%m') AS _time
  , VirtualSensorCode AS _from
  , `sensor_id` AS _to
  , count(*) AS _devices
  FROM nearest_ping
  WHERE DateTimeLocal < STR_TO_DATE('2018-01-01', '%Y-%m-%d')
    AND sensor_id IS NOT NULL

  GROUP BY DATE_FORMAT(DateTimeLocal, '%Y-%m'), VirtualSensorCode, sensor_id

  LIMIT 20
```




CREATE TABLE `device` (
  `id` int(11) NOT NULL,
  `VirtualSensorCode` int(11) DEFAULT NULL,
  `DateTimeLocal` datetime DEFAULT NULL,
  `code_address` int(11) DEFAULT NULL,
  `Duration` float DEFAULT NULL,
  `year` int(11) DEFAULT NULL,
  `month` int(11) DEFAULT NULL,
  `day` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `Sensor` (`VirtualSensorCode`),
  KEY `device` (`DateTimeLocal`),
  KEY `sensor_time` (`code_address`,`DateTimeLocal`),
  KEY `time_sensor` (`DateTimeLocal`,`VirtualSensorCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



UPDATE device
   SET year = DATE_FORMAT(`DateTimeLocal`, '%Y')
     , month = DATE_FORMAT(`DateTimeLocal`, '%m')
     , day = DATE_FORMAT(`DateTimeLocal`, '%d')

### 

Onderstaande query duurde 5 uur:
- -rw-rw-rw-  1 clemens  staff    0 Jun  9 16:01 nearest_ping_y_m_d.csv
- -rw-rw-rw-  1 clemens  staff  1733468 Jun  9 19:56 nearest_ping_y_m_d.csv

```sql
SELECT year, month, day, _from_sensor, _next_sensor, count(*) FROM nearest_ping GROUP BY year, month, day, _from_sensor, _next_sensor INTO OUTFILE '/Users/clemens/Sites/ds/leeuwarden/ds-leeuwarden/Sample_Data/Processed/nearest_ping_y_m_d.csv';
```



```sql
SELECT year, month, count(*) FROM device
--   WHERE year > 2018
  GROUP BY year, month
```

results into
```
2016	1	342774
2016	2	509962
2016	3	830134
2016	4	1033960
2016	5	1117265
2016	6	1033004
2016	7	1123429
2016	8	1123330
2016	9	1194045
2016	10	1223339
2016	11	1173062
2016	12	1207320
2017	1	1058163
2017	2	974107
2017	3	1247302
2017	4	1339754
2017	5	1552403
2017	6	1248948
2017	7	1393698
2017	8	1305609
2017	9	1278601
2017	10	1456632
2017	11	1464717
2017	12	1390198
2018	1	1251473
2018	2	1169267
2018	3	1388283
2018	4	963917
```
