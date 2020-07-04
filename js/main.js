/*
*    main.js
*    Mastering Data Visualization with D3.js
*    CoinStats
*/

let formattedData = {};
let coinData;

const t = function(){ return d3.transition().duration(500); }

const margin = { left:80, right:100, top:50, bottom:100 },
    height = 500 - margin.top - margin.bottom, 
    width = 800 - margin.left - margin.right;

const svg = d3.select("#chart-area").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

const g = svg.append("g")
    .attr("transform", "translate(" + margin.left + 
        ", " + margin.top + ")");

// Time parser for x-scale
const parseTime = d3.timeParse("%d/%m/%Y");
const formatTime = d3.timeFormat("%d/%m/%Y");

// For tooltip
const bisectDate = d3.bisector(function(d) { return d.date; }).left;

// Scales
var x = d3.scaleTime().range([0, width]);
var y = d3.scaleLinear().range([height, 0]);

// Axis generators
const xAxisCall = d3.axisBottom()
    .ticks(4);
const yAxisCall = d3.axisLeft()
    .ticks(6)
    .tickFormat(function(d) { return parseInt(d / 1000) + "k"; });

// Axis groups
const xAxis = g.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")");
const yAxis = g.append("g")
    .attr("class", "y axis")
    
// Y-Axis label
const yAxisLabel = yAxis.append("text")
    .attr("class", "axis-title")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .attr("fill", "#5D6971");


// Add line to chart
const linePath = g.append("path")
    .attr("class", "line")
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", "2px");

/******************************** Tooltip Code ********************************/
    let focus = g.append("g")
        .attr("class", "focus")
        .style("display", "none");

    focus.append("line")
        .attr("class", "x-hover-line hover-line")
        .attr("y1", 0)
        .attr("y2", height);

    focus.append("line")
        .attr("class", "y-hover-line hover-line")
        .attr("x1", 0)
        .attr("x2", width);

    focus.append("circle")
        .attr("r", 7.5);

    focus.append("text")
        .attr("x", 15)
        .attr("dy", ".31em");

    const rectOverlay = g.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .on("mouseover", function() { focus.style("display", null); })
        .on("mouseout", function() { focus.style("display", "none"); });
/******************************** Tooltip Code ********************************/


/******************************** Event Listeners ********************************/
$("#coin-select").on("change", update)

$("#var-select").on("change", update)

$("#date-slider").slider({
    max: parseTime("31/10/2017").getTime(),
    min: parseTime("5/12/2013").getTime(),
    step: 86400000,
    range:true,
    values: [parseTime("5/12/2013").getTime(), parseTime("31/10/2017").getTime()],
    slide: function(event,ui){
        $("#dateLabel1").text(formatTime(new Date(ui.values[0])));
        $("#dateLabel2").text(formatTime(new Date(ui.values[1])));
        update();
    }
})



/*Formatting for yAxis labels*/
const formatSi = d3.format(".2s");
function formatAbbreviation(x){
    let s = formatSi(x);
    switch(s[s.length - 1]){
        case "G": return s.slice(0,-1) + "B";
            break;
        case "k": return s.slice(0,-1) + "K";
            break;
    }
    return s;
}

d3.json("data/coins.json").then(function(data) {
    // Data cleaning
    for(let coin in data){
        if(!data.hasOwnProperty(coin)){
            continue;
        }

        formattedData[coin] = data[coin].filter(d => !(d.price_usd==null));

        formattedData[coin].forEach(d => {
            d["date"] = parseTime(d.date);
            d["price_usd"] = +d.price_usd;
            d["market_cap"] = +d.market_cap;
            d["24h_vol"] = +d["24h_vol"]; 

        });
    }
    
    update();
});

function update(){
    let coin = $("#coin-select").val();
    let value = $("#var-select").val();
    let sliderValues = $("#date-slider").slider("values");

    let dateFilteredData = formattedData[coin].filter(d => {
        return (d.date >= sliderValues[0] && d.date <= sliderValues[1]);
        }
    );

    // Set scale domains
    x.domain(d3.extent(dateFilteredData, function(d) { return d.date; }));
    y.domain([d3.min(dateFilteredData, function(d) { return d[value]; }) / 1.005, 
    d3.max(dateFilteredData, function(d) { return d[value]; }) * 1.005]);
    

    // Generate axes once scales have been set
    xAxisCall.scale(x);
    xAxis.transition(t())
        .call(xAxisCall);

    yAxisCall.scale(y);
    yAxis.transition(t())
        .call(yAxisCall.tickFormat(formatAbbreviation));
    

    // Line path generator
    var line = d3.line()
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d[value]); });


    //Update the data for the linePath
    linePath.transition(t)
        .attr("d", line(dateFilteredData));

    rectOverlay.on("mousemove", mousemove);
    
    function mousemove() {
        var x0 = x.invert(d3.mouse(this)[0]),
            i = bisectDate(dateFilteredData, x0, 1),
            d0 = dateFilteredData[i - 1],
            d1 = dateFilteredData[i],
            d = x0 - d0.date > d1.date - x0 ? d1 : d0;
            focus.attr("transform", "translate(" + x(d.date) + "," + y(d[value]) + ")");
            focus.select("text").text(d3.format("$,.2f")(d[value]));
            focus.select(".x-hover-line").attr("y2", height - y(d[value]));
            focus.select(".y-hover-line").attr("x2", -x(d.date));
    }

    /*Update label of y-axis*/
    let newText = (value === "price_usd") ? "Price (USD)" 
                                        : (value === "market_cap") ? "Market Capitalization (USD)"
                                        : "24 Hour Trading Volume (USD";

    yAxisLabel.transition(t())
        .text(newText).style("text-transform","capitalize");

}

