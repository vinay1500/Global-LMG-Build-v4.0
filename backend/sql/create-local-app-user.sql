CREATE DATABASE IF NOT EXISTS global_lmg
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS 'global_lmg_app'@'127.0.0.1'
  IDENTIFIED BY 'GLMG_App_Local_2026_Db';
CREATE USER IF NOT EXISTS 'global_lmg_app'@'localhost'
  IDENTIFIED BY 'GLMG_App_Local_2026_Db';

ALTER USER 'global_lmg_app'@'127.0.0.1'
  IDENTIFIED BY 'GLMG_App_Local_2026_Db';
ALTER USER 'global_lmg_app'@'localhost'
  IDENTIFIED BY 'GLMG_App_Local_2026_Db';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES
  ON global_lmg.* TO 'global_lmg_app'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES
  ON global_lmg.* TO 'global_lmg_app'@'localhost';

FLUSH PRIVILEGES;
