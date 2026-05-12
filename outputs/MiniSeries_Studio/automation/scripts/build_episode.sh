#!/usr/bin/env bash
# Assemble a 9:16 episode from clips + voice + music + captions.
#
# Usage:  build_episode.sh <SERIES> <EPISODE_PADDED>      e.g.  build_episode.sh S1 03
#
# Inputs (under /app/media):
#   shots/<SER>_EP<EE>_shot{1..6}.mp4   ← 6 Sora clips, ~5s each
#   voice/<SER>_EP<EE>/voice.mp3        ← concatenated VO
#   music/<SER>_EP<EE>.mp3              ← music bed (optional)
#   episodes/<SER>_EP<EE>/captions.csv  ← "start,end,text" rows
#
# Output: /app/out/<SER>_EP<EE>.mp4  + thumb_<SER>_EP<EE>.jpg

set -euo pipefail
SERIES="${1:?usage: build_episode.sh <SERIES> <EE>}"
EE="${2:?usage: build_episode.sh <SERIES> <EE>}"

MEDIA="${MEDIA:-/app/media}"
OUT="${OUT:-/app/out}"
FONT="${FONT:-/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf}"

mkdir -p "${OUT}"

SHOT_LIST="${MEDIA}/episodes/${SERIES}_EP${EE}/shots.txt"
mkdir -p "$(dirname "${SHOT_LIST}")"
: > "${SHOT_LIST}"
for n in 1 2 3 4 5 6; do
  f="${MEDIA}/shots/${SERIES}_EP${EE}_shot${n}.mp4"
  [[ -f "$f" ]] || { echo "missing shot ${n}: $f"; exit 1; }
  echo "file '${f}'" >> "${SHOT_LIST}"
done

CAPTIONS="${MEDIA}/episodes/${SERIES}_EP${EE}/captions.csv"
VOICE="${MEDIA}/voice/${SERIES}_EP${EE}/voice.mp3"
MUSIC="${MEDIA}/music/${SERIES}_EP${EE}.mp3"
[[ -f "$MUSIC" ]] || MUSIC=""

# Build a drawtext filter chain from captions.csv (start,end,text).
DRAW=""
if [[ -f "${CAPTIONS}" ]]; then
  while IFS=',' read -r start end text; do
    text="${text%\"}"; text="${text#\"}"
    text="${text//\'/\\\'}"
    DRAW="${DRAW}drawtext=fontfile=${FONT}:text='${text}':fontcolor=white:fontsize=46:borderw=4:bordercolor=black@0.9:x=(w-text_w)/2:y=h-h/4:enable='between(t,${start},${end})',"
  done < "${CAPTIONS}"
fi
DRAW="${DRAW%,}"

CONCAT_FILTER="[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p${DRAW:+,${DRAW}}[v]"

AUDIO_INPUTS=( -i "${VOICE}" )
AUDIO_IDX_VOICE=1
AMIX_IN="[${AUDIO_IDX_VOICE}:a]volume=1.0[av];[av]"
NEXT_IDX=2
if [[ -n "${MUSIC}" ]]; then
  AUDIO_INPUTS+=( -i "${MUSIC}" )
  AMIX_IN="${AMIX_IN}[${NEXT_IDX}:a]volume=0.18[am];[av][am]amix=inputs=2:duration=first:dropout_transition=2"
  NEXT_IDX=$((NEXT_IDX+1))
else
  AMIX_IN="${AMIX_IN}anull"
fi

OUT_MP4="${OUT}/${SERIES}_EP${EE}.mp4"
OUT_THUMB="${OUT}/thumb_${SERIES}_EP${EE}.jpg"

ffmpeg -y \
  -f concat -safe 0 -i "${SHOT_LIST}" \
  "${AUDIO_INPUTS[@]}" \
  -filter_complex "${CONCAT_FILTER};${AMIX_IN}[aout]" \
  -map "[v]" -map "[aout]" \
  -c:v libx264 -preset medium -crf 20 -profile:v high -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart \
  "${OUT_MP4}"

# Grab a thumb 0.5s in
ffmpeg -y -i "${OUT_MP4}" -ss 00:00:00.5 -vframes 1 -q:v 2 "${OUT_THUMB}"

echo "OK  ${OUT_MP4}"
echo "OK  ${OUT_THUMB}"
