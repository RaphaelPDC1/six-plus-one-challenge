# Notification Platform Findings

Apple documentation confirms that web apps can send Web Push notifications through standards-based Push API, Notifications API, Badging API, and Service Workers. Apple notes that the site must ask permission from a direct user gesture, register/store a push endpoint and encryption keys, use a service worker to receive pushes, and display visible notifications immediately because Safari does not support invisible push notifications.

MDN documentation confirms that Push API and Notifications API work together for PWAs: Push delivers server-originated content to the app through a service worker, and Notifications API displays operating-system notifications even when the web app is out of focus or closed. MDN also confirms that push requires server-side support, VAPID keys, service-worker registration, subscription storage, and a push send endpoint.

Architecture implication for 6+1 Challenge: notification reminders are a deterministic WebDev feature, not a scheduled Manus execution feature. The app should store notification preferences and subscriptions, then use backend job/webhook execution for rule-based reminders. Native widgets are not necessary for the first useful Training Advantage release.

Sources reviewed: Apple Developer Documentation, “Sending web push notifications in web apps and browsers”; MDN, “Make PWAs re-engageable using Notifications and Push APIs.”
