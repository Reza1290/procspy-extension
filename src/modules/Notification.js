export class Notification {
    constructor(notificationId, title, desc = "", icon = "assets/images/icon-16.png") {
        this.notificationId = notificationId;
        this.title = title;
        this.desc = desc;
        this.icon = icon;

        this.onClickHandler = null;
        this.onButtonClickHandler = null;
        this.onCloseHandler = null;

        this.addEventListeners(); 
    }

    sendNotification(buttons = []) {
        const options = {
            type: "basic",
            iconUrl: this.icon,
            title: this.title,
            message: this.desc,
            buttons: buttons.map(title => ({ title })), 
            requireInteraction: true
        };

        chrome.notifications.create(this.notificationId, options);
    }

    updateNotification(newTitle, newDesc, newIcon = this.icon, buttons = []) {
        const options = {
            type: "basic",
            iconUrl: newIcon,
            title: newTitle,
            message: newDesc,
            buttons: buttons.map(title => ({ title })), 
            requireInteraction: true
        };

        chrome.notifications.update(this.notificationId, options, (wasUpdated) => {
        });
    }

    clearNotification() {
        chrome.notifications.clear(this.notificationId, (wasCleared) => {
        });
    }

    setOnClick(callback) {
        if (typeof callback === "function") {
            this.onClickHandler = callback;
        }
    }

    setOnButtonClick(callback) {
        if (typeof callback === "function") {
            this.onButtonClickHandler = callback;
        }
    }

    setOnClose(callback) {
        if (typeof callback === "function") {
            this.onCloseHandler = callback;
        }
    }

    addEventListeners() {
        chrome.notifications.onClicked.addListener((id) => {
            if (id === this.notificationId && this.onClickHandler) {
                this.onClickHandler();
            }
        });

        chrome.notifications.onButtonClicked.addListener((id, btnIdx) => {
            if (id === this.notificationId && this.onButtonClickHandler) {
                this.onButtonClickHandler(btnIdx);
            }
        });

        chrome.notifications.onClosed.addListener((id, byUser) => {
            if (id === this.notificationId && this.onCloseHandler) {
                this.onCloseHandler(byUser);
            }
        });
    }
}
