//var adj = [[1, 2, 3], [0, 2, 3], [0,1,3], []];
function generate_rand_adj(count, edge_prob, weighted, lo, hi) {
  adj = []

  if (weighted) {

  } else {
    for (let cur = 0 ; cur < count ; ++cur) {
      temp = [];
      for (let i = 0 ; i < count ; ++i) {
        rng = Math.floor(Math.random() * 100);
        if (rng <= edge_prob && cur != i) {
          temp.push(i);
        }
      }
      adj.push(temp);
    }
  }
  console.log(adj);
  return adj;
}

adj = generate_rand_adj(25, 5, false, 0, 0);

//adj = [[1, 2, 3], [0, 2, 3], [0,1,3], []];
var nodes = [];
var edges = [];
var radius = 200; // radius of the circle
var centerX = 500; // x-coordinate of the center of the circle
var centerY = 500;

var weighted = false;
var directed = true;


for (var i = 0; i < adj.length; i++) {
  var angle = ((2 * Math.PI) / adj.length) * i;
  var x = Math.round(centerX + radius * Math.cos(angle));
  var y = Math.round(centerY + radius * Math.sin(angle));
  nodes.push({ x: x, y: y, label: i });
}
// Create edges
for (var i = 0; i < adj.length; i++) {
  for (var j = 0; j < adj[i].length; j++) {
      if (weighted) {
          var valid = true;
          if (valid) {
              edges.push({ start: i, end: adj[i][j][0], weight: adj[i][j][1] });
          }
      } else {
          edges.push({ start: i, end: adj[i][j] });
      }
  }
}

//console.log(nodes, edges);

var graph = document.querySelector(".graph");

for (var i = 0; i < nodes.length; i++) {
  var node = document.createElement("div");
  node.classList.add("node");
  node.classList.add("noselect");
  node.style.backgroundColor = "black";
  node.style.color = "white";
  node.style.width = "50px";
  node.style.height = "50px";
  node.style.position = "absolute";
  node.style.left = nodes[i].x + "px";
  node.style.top = nodes[i].y + "px";
  node.style.textAlign = "center";
  node.style.lineHeight = "50px";
  node.innerHTML = nodes[i].label;
  node.id = "node-" + nodes[i].label;
  graph.appendChild(node);
  node.style.zIndex = "10";
}

function drawArrow(x1, y1, x2, y2) {
  var arrowHead = document.createElement("div");
  arrowHead.classList.add("arrow-head");
  graph.appendChild(arrowHead);
  var angle = Math.atan2(y2 - y1, x2 - x1);

  var offset = 28;
  //var length = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
  radius = 200;
  arrowHead.style.left = x2 - offset * Math.cos(angle) - 5 + "px";
  arrowHead.style.top = y2 - offset * Math.sin(angle) - 4 + "px";
  arrowHead.style.transform = "rotate(" + (angle + Math.PI / 2) + "rad)";
  //arrowHead.style.transform = `translate(${}px, ${}px)`;
  arrowHead.style.transform += "rotate(180deg)";
  //console.log(`(${arrowHead.style.left}, ${arrowHead.style.top}), ${angle}`);
  //console.log(`(${x1}, ${y2}) (${x2}, ${y2})`)
}

function draw_edges() {
  for (var i = 0; i < edges.length; i++) {
      var edge = document.createElement("div");
      var startNode = document.getElementById("node-" + edges[i].start);
      var endNode = document.getElementById("node-" + edges[i].end);
      var startX = startNode.offsetLeft + 25;
      var startY = startNode.offsetTop + 25;
      var endX = endNode.offsetLeft + 25;
      var endY = endNode.offsetTop + 25;
      if (weighted) {
          var weight = edges[i].weight;
          var weightLabel = document.createElement("div");
          weightLabel.innerHTML = weight;
          weightLabel.classList.add("weight-label");
          weightLabel.style.position = "absolute";
          weightLabel.style.left = (startX + endX) / 2 + "px";
          weightLabel.style.top = (startY + endY) / 2 + "px";
          weightLabel.style.transform = "rotate(0rad)";
          weightLabel.style.transformOrigin = "center center";
          graph.appendChild(weightLabel);
      }
      edge.classList.add("edge");
      edge.style.position = "absolute";
      edge.style.left = startX + "px";
      edge.style.top = startY + "px";
      edge.style.width = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)) + "px";
      edge.style.transform = "rotate(" + Math.atan2(endY - startY, endX - startX) + "rad)";
      edge.style.transformOrigin = "left center";
      if (directed) {
        drawArrow(startX, startY, endX, endY);
      }
      graph.appendChild(edge);
  }
}
draw_edges();
function removeEdgesAndArrows() {
  var edges = document.getElementsByClassName("edge");
  var arrows = document.getElementsByClassName("arrow-head");
  var labels = document.getElementsByClassName("weight-label");
  while (labels.length > 0) {
      labels[0].parentNode.removeChild(labels[0]);
  }
  while (arrows.length > 0) {
    arrows[0].parentNode.removeChild(arrows[0]);
}
  while (edges.length > 0) {
      edges[0].parentNode.removeChild(edges[0]);
  }
  
}
console.log(nodes);

let isDragging = false;
let currentNode;

nodes.forEach(function (i) {
  var node = document.getElementById(`node-${i.label}`);
  node.addEventListener("mousedown", function (e) {
      isDragging = true;
      currentNode = node;
      //currentNode.classList.add("dragging");
      offset = {
          x: currentNode.offsetLeft - e.clientX,
          y: currentNode.offsetTop - e.clientY,
      };
  });
});

document.addEventListener("mouseup", function (e) {
  isDragging = false;
  if (currentNode) {
      //currentNode.classList.remove("dragging");
  }
});

document.addEventListener("mousemove", function (e) {
  if (isDragging) {
    //console.log(currentNode.classList);
      removeEdgesAndArrows();
      draw_edges();
      node = currentNode;
      var currentX = e.clientX;
      var currentY = e.clientY;

      var newX = currentX + offset.x;
      var newY = currentY + offset.y;

      node.style.left = newX + "px";
      node.style.top = newY + "px";
  }
});
