WITH StatusData AS (
    SELECT ORDNUMBER AS Ack, 'OEORDH' AS SourceTable, COMPLETE
    FROM `SAGE-AUTO-UPDATE`.OEORDH
    WHERE ORDNUMBER LIKE 'ACK%'

    UNION ALL

    SELECT ORDNUMBER, 'OESHID', COMPLETE
    FROM `SAGE-AUTO-UPDATE`.OESHID
    WHERE ORDNUMBER LIKE 'ACK%'

    UNION ALL

    SELECT ORDNUMBER, 'OESHIH', COMPLETE
    FROM `SAGE-AUTO-UPDATE`.OESHIH
    WHERE ORDNUMBER LIKE 'ACK%'
),
Pivoted AS (
    SELECT
        Ack,
        MAX(CASE WHEN SourceTable = 'OEORDH' THEN COMPLETE END) AS ORD_Status,
        MAX(CASE WHEN SourceTable = 'OESHID' THEN COMPLETE END) AS SHID_Status,
        MAX(CASE WHEN SourceTable = 'OESHIH' THEN COMPLETE END) AS SHIH_Status
    FROM StatusData
    GROUP BY Ack
)
SELECT
    Ack,
    CONCAT('OEORDH:', IFNULL(ORD_Status,'NULL'), ', ',
           'OESHID:', IFNULL(SHID_Status,'NULL'), ', ',
           'OESHIH:', IFNULL(SHIH_Status,'NULL')) AS StatusByTable,

    CASE
        WHEN ORD_Status = 3 THEN 'Completed'
        WHEN ORD_Status = 1 
             AND (SHID_Status IS NULL AND SHIH_Status IS NULL) THEN 'Never Shipped'
        WHEN ORD_Status = 1
             AND SHID_Status = 2 
             AND SHIH_Status = 3 THEN 'Partially Shipped'
        ELSE 'Unknown'
    END AS Classification
FROM Pivoted
ORDER BY CAST(SUBSTRING(Ack, 4) AS UNSIGNED);
