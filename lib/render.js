function renderHtml() {
    const asciidoctor = Asciidoctor()
    const registry = asciidoctor.Extensions.create()
    abbrPostprocessor(registry, "tnc")

    return asciidoctor.convert(contentA, {
        extension_registry: registry
    })
}

function render() {
    document.getElementsByTagName("body")[0].innerHTML = renderHtml()
}
