from pathlib import Path

ROOT = Path('/home/ubuntu/six-plus-one-challenge')

replacements = {
    'client/src/pages/Home.tsx': {
        'Log today.': 'Log the day.',
        'Six checks. One submission. No hiding.': 'Six standards. One honest submission. No cover.',
        'Pass secured': 'Standard met',
        'Must-do today': 'Today’s non-negotiables',
        'Six rules. Five gets the day.': 'Six rules. Five banks the day.',
        'more for pass': 'more to bank it',
        'Live points strip': 'Live points',
        '5/6 is a pass. Submit the day to bank the points shown above.': '5/6 banks the day. Submit once the work is real.',
        'Kept clean today': 'No alcohol. No negotiation.',
        'Food stayed inside the rules': 'Food stayed on standard',
        'Anything the group should know?': 'Any context worth recording?',
        'Run, gym, mobility...': 'Run, gym, mobility…',
        'Upload images/videos, paste Strava, or add a proof note': 'Upload proof, paste Strava, or add a clear note',
        'Camera': 'Take proof',
        'Library': 'Choose proof',
        'Teach the group one thing.': 'Teach one useful thing from today.',
        'Logged honestly': 'Everything tracked honestly',
        'Rules addressed': 'Standards logged',
        'Current streak': 'Streak held',
        'Projected pts': 'Points in play',
        'Submitting the log': 'Banking the day',
        'Saving progress': 'Saving the work',
        'Save progress —': 'Save draft —',
        'Draft only until 5/6 is reached. Lives judged after rollover.': 'Draft only until 5/6 is real. Lives are judged at rollover.',
        'Draft restored': 'Draft recovered',
        'Missed after rollover:': 'Rollover miss:',
        'Penalty logged.': 'Penalty recorded.',
        'Lives remain': 'Lives remaining',
        'One shot. No repeats.': 'One rescue. No repeats.',
        'Tap once after a lost life to restore one purple Ghost Life. It cannot be used twice.': 'Use it once after a lost life to restore one purple Ghost Life. After that, it is gone.',
        'Summoning ghost life': 'Restoring Ghost Life',
        'Use purple Ghost Life': 'Use Purple Ghost Life',
        'Last Warden note': 'Latest Warden note',
        'Nothing to hide behind. Log the day.': 'No hiding place. Log the day.',
        'Reading the room': 'Reading the evidence',
        "The Warden is checking today's log, proof, lives, and reflection depth.": 'The Warden is reading today’s log, proof, lives, and private reflection signal.',
        'AI read': 'Warden read',
        'Data read': 'Rules read',
        'Overview · pressure map': 'Overview · pressure board',
        'Alarming pace check: participants only count as on pace when their completed challenge days have kept up with day ': 'Pace is strict: you only count as on track when completed challenge days have kept up with day ',
        'Today green': 'Banked today',
        'Risk flags': 'Pressure flags',
        ' is the current pressure signal': ' is carrying the current pressure signal',
        'Live app points': 'Live points bank',
        'Visible task, proof, insight and tracking value from today': 'Today’s visible value from tasks, proof, insight, and tracking',
        'Top boost earner': 'Boost leader',
        'No boost wins banked yet': 'No boosts banked yet',
        "Today's three +5 windows.": 'Three +5 windows. Earned, not given.',
        '+5 additive': '+5 bonus available',
        'Your banked boosts:': 'Your boost bank:',
        'Base scores stay untouched.': 'Base scoring stays clean.',
        'Unclaimed windows still open:': 'Still open:',
        'Personal rivalry': 'Rival pressure',
        'Who you chase. Who is hunting you.': 'The gap above. The threat below.',
        'You are chasing': 'Target above',
        'Top of your lane': 'No one above you',
        'No one sits directly above you right now.': 'You are setting the pace in your lane.',
        'Behind you': 'Threat below',
        'No immediate tail': 'No close threat',
        'Hold the standard before someone closes the gap.': 'Hold the standard before the room closes in.',
        'Compare list': 'Pressure list',
        'Lives. Pace bars. Risk badges.': 'Lives, pace, risk — all visible.',
        'Presentation only: the same participant points, lives, logs, pass pace, proof and risk calculations are still used underneath.': 'Same points, lives, logs, proof, pace, and risk logic — just shown sharper.',
        'High risk': 'Red zone',
        'Watch': 'Watch closely',
        'Stable': 'Holding',
        'pass pace': 'pace',
        'Participant stats': 'Participant dossier',
        'Tap the display picture to enlarge it.': 'Tap the display picture for a closer look.',
        'Lives status': 'Life status',
        'Board compliance': 'Compliance read',
        'Tapped profile detail.': 'Latest proof of standard.',
        'No submitted rules yet for this participant.': 'No submitted standards yet for this participant.',
        'No proof media attached yet.': 'No proof attached yet.',
        'Link / note': 'Proof note',
        'Proof image could not preview inline.': 'Proof could not preview here.',
        'Tap the link below to open the stored image directly.': 'Open the stored proof directly below.',
        'Open proof image': 'Open proof',
        'CHALLENGE LEADER': 'STANDARD SETTER',
        'CLOSEST THREAT': 'NEAREST THREAT',
        'PODIUM HOLD': 'PODIUM POSITION',
        'Score': 'Points',
    },
    'client/src/pages/Register.tsx': {
        '6+1 registration': '6+1 intake',
        'Five answers. One universal Warden.': 'Five answers. One standard.',
        'Back home': 'Back to base',
        'New challenger': 'New contender',
        'Register once.': 'Enter once. Show up daily.',
        'Universal Warden': 'The Warden reads the work',
        'Registration questions': 'Challenger intake',
        'Complete registration': 'Enter the challenge',
        'Registering': 'Securing entry',
        'No Warden type selection': 'No Warden type selection',
    },
    'client/src/pages/Calendar.tsx': {
        'Loading calendar...': 'Loading the 50-day map…',
        'Flick calendar': 'Flick calendar',
        'Current status': 'Current position',
        'Hide full calendar': 'Hide full map',
        'Expand full calendar': 'Open full map',
        'Days Completed': 'Days banked',
        'Current Streak': 'Streak held',
        'Lives Remaining': 'Lives remaining',
        'Full journey': 'Full campaign',
        '50-Day map': '50-day map',
        'Done': 'Banked',
        'Missed': 'Lost',
        'Open': 'Live',
        'Future': 'Locked',
        'Not started': 'Not opened',
        'Completed': 'Banked',
        'Missed rules': 'Standards missed',
        'In progress': 'Live now',
    },
    'client/src/pages/NotFound.tsx': {
        'Page Not Found': 'Page off the board',
        "Sorry, the page you are looking for doesn't exist. It may have been moved or deleted.": 'That route is not in play. Return to base and stay on the board.',
        'Go Home': 'Return to base',
    },
    'client/src/components/ErrorBoundary.tsx': {
        'An unexpected error occurred.': 'The board hit an unexpected fault.',
        'Reload Page': 'Reload the board',
    },
}

misses: list[str] = []
changed_files: list[str] = []
for rel, mapping in replacements.items():
    path = ROOT / rel
    text = path.read_text()
    original = text
    for old, new in mapping.items():
        if old not in text:
            misses.append(f'{rel}: {old!r}')
            continue
        text = text.replace(old, new)
    if text != original:
        path.write_text(text)
        changed_files.append(rel)

print('Changed files:')
for rel in changed_files:
    print(f'- {rel}')
if misses:
    print('\nMissed replacements:')
    for miss in misses:
        print(f'- {miss}')
