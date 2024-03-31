function renderHtml() {
    const asciidoctor = Asciidoctor()
    const registry = asciidoctor.Extensions.create()
    tncPostprocessor(registry)

    return asciidoctor.convert(contentA, {
        extension_registry: registry
    })
}

function render() {
    document.getElementsByTagName("body")[0].innerHTML = renderHtml()
}
