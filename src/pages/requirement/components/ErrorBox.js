function ErrorBox(message) {
    const template = document.createElement('template');
    template.innerHTML = `
        <li class="px-5 py-1 text-red-800">
            ${message}
        </li>
    `.trim();
    return template.content.firstElementChild;
}

export default ErrorBox