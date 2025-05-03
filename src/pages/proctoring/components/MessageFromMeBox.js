function MessageFromMeBox(message) {
    const template = document.createElement('template');
    template.innerHTML = `
        <div class="flex flex-col items-end w-full gap-2">
            <div class="flex justify-between items-center gap-2">
                <h1>Me</h1>
                <div class="w-4 h-4 bg-white/10 rounded-full max-w-2/3">
                
                </div>
            </div>
            <div class="p-2 bg-blue-600 rounded-md ">
                <p>${message}</p>
            </div>
        </div>
    `.trim();
    return template.content.firstElementChild;
}

export default MessageFromMeBox