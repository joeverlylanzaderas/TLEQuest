// mobile/src/utils/useSubmissionQueueSync.ts
// Keeps trying to send saved submissions: when the app opens, when it comes
// back to the foreground, and every 30 seconds while it is open.
import { useEffect } from 'react';
import { Alert, AppState } from 'react-native';
import { flushQueue, refreshPendingCount, takeOldFailures } from './submissionQueue';

const RETRY_EVERY_MS = 30000;
const TELL_ABOUT_FAILURES_AFTER_MS = 2 * 60 * 1000; // newer ones are handled by the submit screen itself

export function useSubmissionQueueSync(userId: number | undefined) {
  useEffect(() => {
    if (!userId) return;
    let running = false;

    async function run() {
      if (running) return;
      running = true;
      try {
        await flushQueue(userId as number);
        const failures = await takeOldFailures(userId as number, TELL_ABOUT_FAILURES_AFTER_MS);
        if (failures.length > 0) {
          Alert.alert(
            'A saved submission could not be sent',
            `${failures.join('\n')}\n\nPlease take the photo again and submit it.`
          );
        }
      } catch {
        // try again on the next round
      } finally {
        running = false;
      }
    }

    refreshPendingCount(userId).then(run);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') run();
    });
    const timer = setInterval(run, RETRY_EVERY_MS);

    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [userId]);
}
