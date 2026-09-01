SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS payments;
CREATE TABLE payments (
  id int(11) NOT NULL AUTO_INCREMENT,
  tenant_id int(11) NOT NULL DEFAULT 1,
  client_id int(11) DEFAULT NULL,
  client_name varchar(255) DEFAULT NULL,
  concept varchar(255) DEFAULT NULL,
  amount decimal(10,2) NOT NULL,
  method varchar(50) DEFAULT NULL,
  discount decimal(10,2) DEFAULT 0,
  promo varchar(255) DEFAULT NULL,
  date datetime DEFAULT current_timestamp(),
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (id)
);

DROP TABLE IF EXISTS equipment;
CREATE TABLE equipment (
  id int(11) NOT NULL AUTO_INCREMENT,
  tenant_id int(11) NOT NULL DEFAULT 1,
  name varchar(255) NOT NULL,
  description text DEFAULT NULL,
  status varchar(50) DEFAULT 'good',
  purchase_date date DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (id)
);

SET FOREIGN_KEY_CHECKS=1;
