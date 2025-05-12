create database transpCalc;

create table Trucks (
TruckID int PRIMARY KEY AUTO_INCREMENT,
TruckName nvarchar(255),
TruckRegNumber nvarchar(255),
TruckFuelUsage float
);

INSERT INTO Trucks (TruckName, TruckRegNumber, TruckFuelUsage)
VALUES
('Volvo FH16', 'AB123CD', 32.5),
('Scania R450', 'EF456GH', 29.7),
('MAN TGX', 'IJ789KL', 31.2);

create table Routes(
RouteID int PRIMARY KEY AUTO_INCREMENT,
StartLocation nvarchar(255),
EndLocation nvarchar(255)
);

create table History(
HistoryID int PRIMARY KEY AUTO_INCREMENT,
RequestDate datetime,
StartPoint nvarchar(255),
EndPoint nvarchar(255),
Distance float,
TotalCost DECIMAL(10, 2),
UsedVehicle nvarchar(255)
);

create table Users(
ID int PRIMARY KEY AUTO_INCREMENT,
email nvarchar(255),
login nvarchar(255),
roll nvarchar(255),
password nvarchar(255)
);

create table IntermediatePoints(
ID int PRIMARY KEY AUTO_INCREMENT,
routeID int,
indexNum int,
pointName nvarchar(255)
);

FLUSH PRIVILEGES;

ALTER USER 'root'@'localhost' IDENTIFIED BY '09122005ABc';

GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION

-- DROP TABLE Trucks;

-- INSERT INTO Trucks (TruckName, TruckRegNumber, TruckFuelUsage)
	-- VALUES ROW('Test Truck 1','А547НН53', 5.2);