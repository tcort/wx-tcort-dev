'use strict';

function celsiusToFahrenheit(temperature_c) {
    return ((9.0/5.0) * temperature_c) + 32.0;
}

function fahrenheitToCelsius(temperature_f) {
    return (temperature_f - 32.0) * (5.0/9.0);
}

function heatIndexFahrenheit(temperature_f, relative_humidity) {
    const T = temperature_f;
    const RH = relative_humidity;

    let HI = -42.379 + 2.04901523*T + 10.14333127*RH - .22475541*T*RH - .00683783*T*T - .05481717*RH*RH + .00122874*T*T*RH + .00085282*T*RH*RH - .00000199*T*T*RH*RH;

    if (RH < 13 && T >= 80 && T <= 112.0) {
        HI = HI - ((13-RH)/4)*Math.sqrt((17-Math.abs(T-95.))/17)
    }

    if (RH > 85 && T >= 80 && T <= 87) {
        HI = HI + ((RH-85)/10) * ((87-T)/5);
    }

    if (T < 80) {
        HI = 0.5 * (T + 61.0 + ((T-68.0)*1.2) + (RH*0.094));

        HI = (HI + T) / 2.0;
    }

    return HI;
}

function heatIndexCelsius(temperature_c, relative_humidity) {
    const temperature_f = celsiusToFahrenheit(temperature_c);
    const heat_index_f = heatIndexFahrenheit(temperature_f, relative_humidity);
    return fahrenheitToCelsius(heat_index_f);
}

module.exports = {
    celsiusToFahrenheit,
    fahrenheitToCelsius,
    heatIndexFahrenheit,
    heatIndexCelsius,
};
