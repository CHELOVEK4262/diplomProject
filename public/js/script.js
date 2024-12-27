document.addEventListener('DOMContentLoaded', function () {
    // Инициализация карты с помощью Leaflet
    var map = L.map('map').setView([53.9006, 27.5590], 7); // Минск
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var startCoords = null;
    var endCoords = null;

    // Добавление автокомплита к полям
    setupAutocomplete('start', 'start-suggestions', true);
    setupAutocomplete('end', 'end-suggestions', false);

    // Обработка кликов правой кнопкой мыши на карте
    map.on('contextmenu', function (e) {
        var contextMenu = L.popup()
            .setLatLng(e.latlng)
            .setContent(
                `<button onclick="setCoords(true, ${e.latlng.lat}, ${e.latlng.lng})">Задать как начальную точку</button><br>` +
                `<button onclick="setCoords(false, ${e.latlng.lat}, ${e.latlng.lng})">Задать как конечную точку</button>`
            )
            .openOn(map);
    });

    window.setCoords = function(isStart, lat, lng) {
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            .then(response => response.json())
            .then(data => {
                var displayName = data.display_name;
                if (isStart) {
                    startCoords = [lat, lng];
                    document.getElementById('start').value = displayName;
                } else {
                    endCoords = [lat, lng];
                    document.getElementById('end').value = displayName;
                }
                map.closePopup();
                if (startCoords && endCoords) {
                    calculateDistance(map, startCoords, endCoords);
                }
            });
    };

    document.getElementById('start').addEventListener('change', function () {
        convertToCoords('start', true);
    });
    document.getElementById('end').addEventListener('change', function () {
        convertToCoords('end', false);
    });

    function convertToCoords(inputId, isStart) {
        var inputValue = document.getElementById(inputId).value;
        if (inputValue && !inputValue.startsWith('Координаты:')) {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(inputValue)}`)
                .then(response => response.json())
                .then(data => {
                    if (data.length > 0) {
                        var coords = [data[0].lat, data[0].lon];
                        if (isStart) {
                            startCoords = coords;
                        } else {
                            endCoords = coords;
                        }
                        if (startCoords && endCoords) {
                            calculateDistance(map, startCoords, endCoords);
                        }
                    } else {
                        alert('Не удалось найти координаты для указанного адреса.');
                    }
                });
        }
    }
});

function setupAutocomplete(inputId, suggestionsId, isStart) {
    var input = document.getElementById(inputId);
    var suggestions = document.getElementById(suggestionsId);

    input.addEventListener('input', function () {
        var query = input.value;

        // Если запрос меньше 3 символов, не показываем подсказки
        if (query.length < 3) {
            suggestions.innerHTML = '';
            return;
        }

        // Запрос к API Nominatim для получения данных автокомплита
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`)
            .then(response => response.json())
            .then(data => {
                // Очистка предыдущих подсказок
                suggestions.innerHTML = '';

                // Если нет результатов, ничего не показываем
                if (data.length === 0) {
                    return;
                }

                // Создание новых подсказок
                data.forEach(function (item) {
                    var suggestion = document.createElement('div');
                    suggestion.innerText = item.display_name;
                    suggestion.addEventListener('click', function () {
                        input.value = item.display_name;
                        suggestions.innerHTML = '';

                        // Установка координат для автокомплита
                        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(item.display_name)}`)
                            .then(response => response.json())
                            .then(locationData => {
                                if (locationData.length > 0) {
                                    var coords = [locationData[0].lat, locationData[0].lon];
                                    if (isStart) {
                                        startCoords = coords;
                                    } else {
                                        endCoords = coords;
                                    }
                                    if (startCoords && endCoords) {
                                        calculateDistance(map, startCoords, endCoords);
                                    }
                                }
                            });
                    });
                    suggestions.appendChild(suggestion);
                });
            });
    });

    // Закрытие подсказок, если клик вне поля или списка
    document.addEventListener('click', function (e) {
        if (!suggestions.contains(e.target) && e.target !== input) {
            suggestions.innerHTML = '';
        }
    });
}

function calculateDistance(map, startCoords, endCoords) {
    if (!startCoords || !endCoords) {
        alert('Не заданы обе точки для маршрута.');
        return;
    }

    // Очистка предыдущих маршрутов
    map.eachLayer(function (layer) {
        if (layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });

    // Запрос к OSRM API для построения маршрута
    fetch(`https://router.project-osrm.org/route/v1/driving/${startCoords[1]},${startCoords[0]};${endCoords[1]},${endCoords[0]}?overview=full&geometries=geojson`)
        .then(response => response.json())
        .then(routeData => {
            if (routeData.routes.length === 0) {
                alert('Не удалось построить маршрут.');
                return;
            }

            // Получение маршрута и расстояния
            var route = routeData.routes[0];
            var distance = route.distance / 1000; // Перевод в километры

            // Вывод расстояния
            document.getElementById('output').innerText = `Расстояние: ${distance.toFixed(2)} км`;

            // Построение маршрута на карте
            var routeCoords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
            var polyline = L.polyline(routeCoords, { color: 'blue' }).addTo(map);
            map.fitBounds(polyline.getBounds());
        });
}