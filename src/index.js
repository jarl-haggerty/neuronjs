var d3 = require("d3");
//var mdlicon = require("material-design-icons/iconfont/material-icons.css")
var mdlcss = require("material-design-lite/material.min.css")
var mdljs = require("material-design-lite/material.min.js")

var line;
var DATA = {};

function replot() {
    for(var key in DATA) {
        if(DATA.hasOwnProperty(key)) {
            plot(key, DATA[key], null, true)
        }
    }
}

function plot(path, data, range, dontAnimate) {
    line = d3.line()

    var domain = d3.extent(data, line.x());
    //domain[0] -= 1; domain[1] += 1;
    if(!range) {
        range = d3.extent(data, line.y());
    }
    //range[0] -= 1; range[1] += 1;

    if(data.length < 2000) {
        var step = (domain[1] - domain[0])/2000.0;
        var newData = []
        var dataIndex = 0;
        var rise = data[1][1] - data[0][1];
        rise /= data[1][0] - data[0][0];
        var x;
        for(var i = 0;i < 2000;i++) {
            x = domain[0] + i*step
            if(data[dataIndex+1][0] <= x && dataIndex+2 < data.length) {
                dataIndex += 1;
                rise = data[dataIndex+1][1] - data[dataIndex][1]
                rise /= data[dataIndex+1][0] - data[dataIndex][0]
            }
            newData.push([x, data[dataIndex][1] + rise*(x - data[dataIndex][0])])
        }
        plot(path, newData, range, dontAnimate)
        return;
    }

    DATA[path] = data;

    var width = window.innerWidth-100

    var xAxisScale = d3.scaleLinear()
        .domain(domain)
        .range([0, width]);
    var xAxis = d3.axisBottom(xAxisScale);

    var yAxisScale = d3.scaleLinear()
        .domain([range[0]-1e-3, range[1]+1e-3])
        .range([500, 0]);
    var yAxis = d3.axisLeft(yAxisScale);

    var svg = d3.select("svg");
    //console.log(domain)
    line.x(function(d) {
        return width*(d[0] - domain[0])/(domain[1] - domain[0])
    })

    var denominator = range[1] - range[0];
    //console.log(range)
    line.y(denominator === 0 ? function(d) {
        return 250;
    } : function(d) {
        return 500*(1 - (d[1] - range[0])/denominator);
    })
    //console.log(data)

    line = line(data)

    d3.select("#x-axis")
        .call(xAxis);
    //if(path === "voltage-path") {
        d3.select("#y-axis")
            .call(yAxis);
    //} else {
    //    d3.select("#y-axis-current")
    //        .call(yAxis);
    //}

    var path = d3.select("#" + path);
    if(!dontAnimate && path.attr("d")) {
        path = path.transition().duration(100)
    }
    path.attr("d", line)
}

function positionButton() {
    var addRow = document.getElementById("add-row");
    var parameterTable = document.getElementById("parameter-table");
    var addRowRect = addRow.getBoundingClientRect()
    var parameterTableRect = parameterTable.getBoundingClientRect()
    var left = Math.min(parameterTableRect.right, window.innerWidth)
    addRow.style.left = left - addRowRect.width - 20
}
window.onresize = function () {
    replot()
    positionButton()
}
function plotSin(frequency) {
    var to = []
    for (var i = 0.0; i < 2*Math.PI; i += .01) {
        to.push([i, Math.sin(frequency*i)])
    }
    plot(to)
}

var duration = 1.0

function plotVoltage() {
    parameters = []

    var rows = document.getElementById("parameter-table").getElementsByTagName("tr");
    for(var i = 0;i < rows.length;i++) {
        var params = {}
        var row = rows.item(i)
        var inputs = row.getElementsByClassName("mdl-textfield__input");
        params.time = parseFloat(inputs.time.value)
        params.current = parseFloat(inputs.current.value)
        params.resistance = parseFloat(inputs.resistance.value)
        params.capacitance = parseFloat(inputs.capacitance.value)
        parameters.push(params)
    }
    console.log(parameters)

    parameters.sort(function(a, b) {
        return a.time - b.time;
    });

    var step = duration / 2000.0
    var time = 0, baseTime = 0, current = 0, resistance = 1, capacitance = 0, voltage = 0, baseVoltage = 0, deltaVoltage = 0, denominator = 0;
    var data = []
    var currentData = []
    var min = Infinity, max = -Infinity;
    for(var i = 0;i < 2000;i++) {
        if(parameters.length > 0 && parameters[0].time <= time) {
            baseTime = time
            current = parameters[0].current
            resistance = parameters[0].resistance
            capacitance = parameters[0].capacitance
            denominator = resistance*capacitance
            baseVoltage = voltage
            deltaVoltage = current*resistance - voltage
            parameters.splice(0, 1)
        }
        var multiplier = denominator === 0 ? 1 : 1 - Math.exp(-(time-baseTime)/(resistance*capacitance));
        voltage = baseVoltage + deltaVoltage*multiplier
        time += step
        data.push([time, voltage])
        currentData.push([time, current])
        min = Math.min(Math.min(min, current), voltage);
        max = Math.max(Math.max(max, current), voltage);
    }
    plot("voltage-path", data, [min, max])
    plot("current-path", currentData, [min, max])
}

function onChange(value) {
    var to = []
    for (var i = 0; i < 1000; i++) {
        to.push([i, 250*Math.sin(value*2*3.14*i/1000)])
    }
    d3.select("#Sine").transition().duration(500).ease(d3.easeLinear).attr("d", line(to))
}

var ROW_TEMPLATE;

window.onload = function() {
    //plotSin(1)
    positionButton()
    ROW_TEMPLATE = document.getElementById("template-row");
    document.getElementById("parameter-table").removeChild(ROW_TEMPLATE)
    plotVoltage()
}
window.plotSin = plotSin
window.addRow = function() {
    var rows = document.getElementsByTagName("tr")
    var lastRow = rows.length < 2 ? ROW_TEMPLATE : rows.item(rows.length-1)
    var clone = lastRow.cloneNode(true)
    document.getElementById("parameter-table").appendChild(clone);
}

window.onSliderChange = function (slider) {
    var textField = slider.parentElement.parentElement.parentElement.getElementsByClassName("mdl-textfield__input").item(0)
    textField.value = "" + slider.value
    plotVoltage()
}

window.onTextChange = function (textField, event) {
    event.preventDefault();
    if (event.keyCode == 13 || event.type === "blur") {
        var slider = textField.parentElement.parentElement.getElementsByClassName("mdl-slider").item(0)
        slider.value = parseFloat(textField.value)
        plotVoltage()
    }
}