/* KDE function. Reference: http://bl.ocks.org/mbostock/4341954 */
function kernelDensityEstimator(kernel, x) {
  return function(sample) {
    return x.map(function(x) {
      return [x, d3.mean(sample, function(v) { return kernel(x - v); })];
    });
  };
}

function epanechnikovKernel(scale) {
  return function(u) {
    return Math.abs(u /= scale) <= 1 ? .75 * (1 - u * u) / (scale) : 0;
  };
}

/* Called on page load */
function draw(data) {

  legendRadius = 8;

  var formatAvg = d3.format(".3f"); // for displaying batting averages

  var margin = {top: 10, right: 30, bottom: 30, left: 30},
      width = 960 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

    /* Lookup data structure for handedness attributes */
    var handednessMap = {
      "R": {"color": "#1b9e77", "text": "Right-Handed", "visible": false},
      "L": {"color": "#d95f02", "text": "Left-Handed", "visible": false},
      "B": {"color": "#7570b3", "text": "Both-Handed", "visible": false}
    };

  /* Draw initial chart */
  drawChart(data, "avg", 0.0);

  /* Go through a few animation frames to make some distribution visible */
  frameNumber = 0;
  var animationInterval = setInterval(function() {
    switch(frameNumber) {
      case 0:
        legendCallback("R");    
        break;
      case 1:
        legendCallback("L");    
        break;
      default:
        clearInterval(animationInterval);
    }
    frameNumber += 1;
   }, 1000);

  /* Callback used to toggle visibility of a handedness class when user clicks on a legend and by the initial animation */
  function legendCallback(handedness) {
    handednessMap[handedness].visible = !handednessMap[handedness].visible;
    drawChart(data, "avg", 0.0);
  }

  /* 
  Function to draw the chart given the data JSON, a specific column namein the data, 
  the minimum value to consider (for filtering out batting averages of .000)
  */
  function drawChart(data, column, minValue) {

    d3.select("svg").remove();
    
    var max = d3.max(data, function(d) { return d[column];});

    var data = data.filter(function(d) {
        return d[column] > minValue;
    });

    var x = d3.scale.linear()
      .domain(d3.extent(data, function(d) {return d[column];} ))
      .range([0, width]);

    var y = d3.scale.linear()
      .domain([0, 18])
      .range([height, 0]);

    var svg = d3.select("body").append("svg")
      .attr("class", "chart")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var xAxis = d3.svg.axis()
      .scale(x)
      .tickFormat(formatAvg)
      .orient("bottom");

    var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .ticks(10);

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .append("text") // text label for the x axis
      .attr("x", width/2)
      .attr("y", 28)
      .style("text-anchor", "middle")
      .text("batting average");

    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .append("text") // text label for the x axis
      .attr("x", -height/2)
      .attr("y", -23)
      .style("text-anchor", "middle")
      .text("probability density")
      .attr("transform", "rotate(-90)")

    /* Loop over the handedness and draw a distribution for each */
    for (handedness in handednessMap) {  
      var filtered = data.filter(function(d) {
        return d['handedness'] === handedness;
      });
      // Gray out probabilities that are not selected
      var opacity = (handednessMap[handedness].visible) ? 1.0 : 0.1;
        drawDistribution(filtered, column, handednessMap[handedness].color, opacity);
    }

    /* Add a Legend */
    var legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", "translate(" + (width - 100) + "," + 20 + ")")
      .selectAll("g")
      .data(["R", "L", "B"])
      .enter().append("g")
      .attr("class", function(d, i) { return d; } )
      .attr("opacity", function(d) { return (handednessMap[d].visible) ? 1.0 : 0.2; } )
      .on("click", function(d) { legendCallback(d) } );

    legend.append("circle")
      .attr("cy", function(d, i) {
        return i * 30;
      })
      .attr("r", function(d) {
          return legendRadius;
      })
      .attr("fill", function(d) { return handednessMap[d].color; })

    legend.append("text")
      .attr("y", function(d, i) {
        return i * 30 + 5;
      })
      .attr("x", legendRadius * 4)
      .text(function(d) {
        return handednessMap[d].text;
      });

    /* Inner function to actually draw the distribution */
    function drawDistribution(data, column, color, opacity) {

      var d = data.map(function(d) {return d[column]; } );
      var kde = kernelDensityEstimator(epanechnikovKernel(.03), x.ticks(1000));
      var k = kde(d);

      var line = d3.svg.line()
        .x(function(d) { return x(d[0]); })
        .y(function(d) { return y(d[1]); });

      var curve = svg.append("path")
        .datum(kde(data.map(function(d) {return d[column]; } )))
        .attr("class", "line")
        .attr("stroke", color)
        .attr("stroke-opacity", opacity)
        .attr("d", line)
    }
  }
}
