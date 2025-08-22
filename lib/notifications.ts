/**
 * Extract the newest message out of a notification messages together with the localized date
 *
 * @param messages all messages in current notification
 * @returns string
 */
function getNewestMessage(messages: { ts: number; message: string }[]): string {
    const newestMessage = messages.sort((a, b) => (a.ts < b.ts ? 1 : -1))[0];

    return `${new Date(newestMessage.ts).toLocaleString()} ${newestMessage.message}`;
}

/**
 * Build up a mail object from the notification message
 *
 * @param message received message from notification manager
 * @returns message to send to app
 */
export function buildMessageFromNotification(message: {
    category: {
        name: string;
        instances: { [instance: string]: { messages: { ts: number; message: string }[] } };
        description: string;
    };
    host: string;
}): {
    title: string;
    message: string;
} {
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
