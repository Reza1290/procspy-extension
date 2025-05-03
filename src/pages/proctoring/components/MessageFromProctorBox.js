function MessageFromProctorBox(message) {
    const template = document.createElement('template');
    template.innerHTML = `
        <div class="flex flex-col items-start w-full gap-2">
            <div class="flex justify-between items-center gap-2 flex-row-reverse">
                <h1>Proctor</h1>
                <div class="w-4 h-4 bg-white/10 rounded-full">

                </div>
            </div>
            <div class="p-2 bg-blue-600/70 rounded-md max-w-2/3">
                <p>
                ${message}
                </p>
            </div>
        </div>
    `.trim();
    return template.content.firstElementChild;
}

export default MessageFromProctorBox