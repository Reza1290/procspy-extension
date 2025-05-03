function AlertBox(message) {
    const template = document.createElement('template');
    template.innerHTML = `
        <div class="flex gap-4 bg-red-600 p-5 py-3 justify-between">
            <p>${message}</p>
        </div>
    `.trim();
    return template.content.firstElementChild;
}

export default AlertBox