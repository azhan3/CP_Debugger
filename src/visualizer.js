class VariableVisualizer {
    constructor(id, value) {
        this.id = codeToHtml(String(id));
        this.value = codeToHtml(String(value));
    }

    getHtmlElement() {
        return `<div>${this.id} = ${this.value}<\div>`;
    }
}

document.getElementById("visualizerArea").innerHTML = new VariableVisualizer("hello", 123).getHtmlElement();