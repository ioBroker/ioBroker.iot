/**
 * Build up a mail object from the notification message
 *
 * @param message
 * @returns
 */
export function buildMessageFromNotification(message) {
    const subject = message.category.name;
    const { instances } = message.category;

    const readableInstances = Object.entries(instances).map(
        ([instance, entry]) => `${instance.substring('system.adapter.'.length)}: ${getNewestMessage(entry.messages)}`,
    );

    const text = `${message.category.description}
${message.host}:
${readableInstances.join('\n')}
    `;

    return { title: subject, message: text };
}

/**
 * Extract the newest message out of a notification messages together with the localized date
 *
 * @param messages
 * @returns string
 */
function getNewestMessage(messages) {
    const newestMessage = messages.sort((a, b) => (a.ts < b.ts ? 1 : -1))[0];

    return `${new Date(newestMessage.ts).toLocaleString()} ${newestMessage.message}`;
}
