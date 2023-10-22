// public/javascripts/script.js
import { createGraph } from './graphUtils.js';

document.addEventListener('DOMContentLoaded', function () {
    // Fetch the payload data from the server
    const scriptElement = document.querySelector('script[src$="script.js"]');
    const parentDiv = scriptElement.parentElement;

    const width = window.innerWidth;
    const height = window.innerHeight;

    fetch('/data/get-payload')
        .then((response) => {
            if (!response.ok) {
                throw new Error('Failed to fetch payload');
            }
            return response.json();
        })
        .then((data) => {

            for (let pageValue = 0 ; pageValue < data.length ; ++pageValue) {
                for (let subPageValue = 0 ; subPageValue < data[pageValue]["content"].length ; ++subPageValue) {
                    console.log(`CREATING GRAPH ${pageValue} - ${subPageValue}`)
                    const adjacencyList = data[pageValue]["content"][subPageValue]["value"];
                    let graphData = adjacencyListToGraph1(adjacencyList);
                    graphData.nodes.sort((a, b) => a.id - b.id);
                    createGraph(580, 580, pageValue, subPageValue, graphData)
                }
            }

            //const n = graphData.nodes.length;

            // Select the corresponding graph container

        })
        .catch((error) => {
            console.error('Error fetching payload:', error);
        });
});

// Rest of your code...

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




