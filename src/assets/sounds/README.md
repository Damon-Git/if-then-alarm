# Sound reminder assets

These WAV files are generated locally by `scripts/generate-sound-reminder-assets.mjs`.
They do not include third-party recordings, samples, or downloaded material.

Generation baseline:

- mono 16-bit PCM WAV
- 48 kHz sample rate
- additive small-bell resonance with a short softened mallet transient
- normalized source peak near 52%, with an additional restrained playback gain in `src/lib/soundReminder.ts`

Semantic mapping:

- `incense-finished.wav`: one short strike for a completed incense stick
- `rest-finished.wav`: two short strikes for a completed break
- `ritual-completed.wav`: three measured strikes for completion of the full ritual

The generated files may be distributed with this application under the same distribution terms as the project.
If a separate public asset license is needed for a future release, define it before publishing the files independently.
