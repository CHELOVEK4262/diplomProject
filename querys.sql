create database transpCalc;

create table Trucks (
TruckID int PRIMARY KEY AUTO_INCREMENT,
TruckName nvarchar(255),
TruckRegNumber nvarchar(255),
TruckFuelUsage float
);

create table Routes(
RouteID int PRIMARY KEY AUTO_INCREMENT,
StartLocation nvarchar(255),
EndLocation nvarchar(255)
);

create table History(
HistoryID int PRIMARY KEY AUTO_INCREMENT,
RequestDate datetime FORMAT 'YYYY-MM-DD',
StartPoint nvarchar(255),
EndPoint nvarchar(255),
Distance float,
TotalCost DECIMAL(10, 2),
UsedVehicle nvarchar(255)
);

-- DROP TABLE Trucks;

-- INSERT INTO Trucks (TruckName, TruckRegNumber, TruckFuelUsage)
	-- VALUES ROW('Test Truck 1','А547НН53', 5.2);