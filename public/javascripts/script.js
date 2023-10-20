// public/javascripts/script.js
document.addEventListener('DOMContentLoaded', function () {
    // Fetch the payload data from the server
    fetch('/data/get-payload')
        .then((response) => {
            if (!response.ok) {
                throw new Error('Failed to fetch payload');
            }
            return response.json();
        })
        .then((data) => {
            const adjacencyList = data[0]["content"][0]["value"];

            let graphData = adjacencyListToGraph1(adjacencyList);

            const width = 1920;
            const height = 1080;
            graphData.nodes.sort((a, b) => a.id - b.id);
            const n = graphData.nodes.length;
            const numColumns = n / 3; // Adjust as needed
            const rowSpacing = height / n;
            const svg = d3.select("#graph")
                .append("svg")
                .attr("width", width)
                .attr("height", height);

            const link = svg.selectAll(".link")
                .data(graphData.links)
                .join("line")
                .attr("class", "link");

            const node = svg.selectAll(".node")
                .data(graphData.nodes)
                .join("g")
                .attr("class", "node")
                .call(d3.drag()
                    .on("start", dragStarted)
                    .on("drag", dragged)
                    .on("end", dragEnded));

            node.append("circle")
                .attr("r", 10);

            node.append("text")
                .attr("class", "label")
                .attr("dx", 12)
                .attr("dy", ".35em")
                .text(d => d.id);

            const simulation = d3.forceSimulation(graphData.nodes)
                .force("link", d3.forceLink(graphData.links).distance(100))
                .force("charge", d3.forceManyBody().strength(-200))
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

            function dragStarted(event) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            }

            function dragged(event) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            }

            function dragEnded(event) {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            }
        })
        .catch((error) => {
            console.error('Error fetching payload:', error);
        });
});

const adjacencyList = {
    "0": []
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
function adjacencyListToGraph1(adjList) {
    const nodes = [];
    const links = [];

    // Create nodes
    for (let i = 0; i < adjList.length; i++) {
        nodes.push({ id: i });
    }

    // Create links based on the adjacency list
    for (let i = 0; i < adjList.length; i++) {
        const targets = adjList[i];
        for (const target of targets) {
            links.push({ source: i, target });
        }
    }

    return { nodes, links };
}

let graphData = adjacencyListToGraph(adjacencyList);


/* document.addEventListener("DOMContentLoaded", function() {
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
}); */