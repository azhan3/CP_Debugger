// public/javascripts/script.js
const adjacencyList = {
    "0": [6, 13, 15, 24],
    "1": [5, 11, 17, 26],
    "2": [5, 8, 21, 25],
    "3": [7, 16, 19, 28],
    "4": [10, 12, 14, 20, 27],
    "5": [1, 2, 9, 17, 22],
    "6": [0, 7, 11, 18, 19],
    "7": [3, 6, 8, 12, 14],
    "8": [2, 7, 13, 16, 29],
    "9": [5, 12, 15, 20],
    "10": [4, 13, 23, 28],
    "11": [1, 6, 12, 21, 27],
    "12": [4, 7, 9, 11, 19],
    "13": [0, 8, 10, 18, 22],
    "14": [4, 7, 16, 23],
    "15": [0, 9, 22, 26],
    "16": [3, 8, 14, 23],
    "17": [1, 5, 19, 24],
    "18": [6, 13, 20, 27, 28],
    "19": [3, 12, 17, 22, 28],
    "20": [4, 9, 18, 25, 29],
    "21": [2, 11, 25, 27],
    "22": [5, 13, 15, 19],
    "23": [10, 14, 16, 28, 29],
    "24": [0, 17, 26, 27],
    "25": [2, 20, 21, 28, 29],
    "26": [1, 15, 24],
    "27": [4, 11, 18, 21, 24],
    "28": [3, 10, 18, 19, 23, 25],
    "29": [8, 20, 23, 25]
};


function adjacencyListToGraph(adjList) {
    const nodes = Object.keys(adjList).map(id => ({ id: parseInt(id) }));
    const links = [];
    for (const [source, targets] of Object.entries(adjList)) {
        for (const target of targets) {
            links.push({ source: parseInt(source), target: parseInt(target) });
        }
    }
    return { nodes, links };
}

const graphData = adjacencyListToGraph(adjacencyList);

const width = 1920;
const height = 1080;
graphData.nodes.sort((a, b) => a.id - b.id);
const n = graphData.nodes.length;
const numColumns = 5; // Adjust as needed
const rowSpacing = height / n;
const svg = d3.select("#graph")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

const link = svg.selectAll(".link")
    .data(graphData.links)
    .join("line")
    .attr("class", "link")
    .attr("stroke-width", 2)
    .attr("stroke", "black");


const node = svg.selectAll(".node")
    .data(graphData.nodes)
    .join("g")
    .attr("class", "node")
    .call(d3.drag()
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded));

node.append("circle")
    .attr("r", 25);

node.append("text")
    .attr("class", "label")
    .attr("dx", "-0.25em")
    .attr("dy", 0)
    .style("fill", "white")
    .style("z-index", "1")
    .text(d => d.id);
function orient() {
    console.log(graphData)
    graphData.nodes.forEach((node, index) => {
        const col = index % numColumns;
        const row = Math.floor(index / numColumns);

        node.x = col * 100; // Adjust the horizontal spacing as needed
        node.y = row * rowSpacing; // Use the row number for vertical positioning
    });
}
orient()
console.log(graphData);
const simulation = d3.forceSimulation(graphData.nodes)
    .force("charge", d3.forceLink(graphData.links).distance(25))
    .force("charge", d3.forceManyBody().strength(-30))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .on("tick", ticked);

function ticked() {
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node
        .attr("transform", d => `translate(${d.x}, ${d.y})`);
}
const snapToGrid = true; // Set this to true to enable snapping
const gridSpacing = 50;
let prev = 0;

function dragStarted(event) {
    if (!event.active) simulation.alphaTarget(0.005).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;

}

function dragged(event) {
    if (snapToGrid) {
        // Snap the dragged node to a grid position
        //event.subject.fx = Math.round(event.x / gridSpacing) * gridSpacing;
        //event.subject.fy = Math.round(event.y / gridSpacing) * gridSpacing;
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    } else {
        // Allow free dragging when not snapping
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }
}
function dragEnded(event) {
    if (!event.active) simulation.alphaTarget(0);

    // If snapping to the grid, ensure the node is snapped to the grid position
    console.log(prev.subject);
    if (snapToGrid) {
        event.subject.fx = Math.round(event.x / gridSpacing) * gridSpacing;
        event.subject.fy = Math.round(event.y / gridSpacing) * gridSpacing;
        prev = event;
        event.subject.fx = null;
        event.subject.fy = null;
    } else {
        // If not snapping, release the dragged node
        event.subject.fx = null;
        event.subject.fy = null;
    }
}
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById('expand').addEventListener('click', function() {
        simulation.force("link", d3.forceLink(graphData.links).distance(500));
        simulation.force("charge", d3.forceManyBody().strength(-200));
    });
});
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById('collapse').addEventListener('click', function() {

        orient()
        simulation.force("link", null);

        simulation.force("charge", d3.forceManyBody().strength(-30))
        simulation.alphaTarget(0).restart();
    });
});