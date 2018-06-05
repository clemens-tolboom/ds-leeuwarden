
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
  KEY `device` (`DateTimeLocal`)
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