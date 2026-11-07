import { useEffect, useRef } from 'react'
import { DialRoot, useDialKit } from 'dialkit'
import 'dialkit/styles.css'
import { SAMPLES, type SampleName } from '@/pattern/samples'
import { useApp } from '@/state/store'
import { tuningConfig } from './config'
import { useTuning } from './store'

const SAMPLE_NAMES = Object.keys(SAMPLES) as SampleName[]

const TuningPanel = () => {
  const values = useDialKit('Tuning', tuningConfig, { id: 'tuning', persist: true })
  const { sample } = useDialKit(
    'Samples',
    {
      sample: { type: 'select', options: SAMPLE_NAMES, default: SAMPLE_NAMES[0] },
      firstVisit: { type: 'action', label: 'Replay first visit' },
      resetTuning: { type: 'action', label: 'Reset tuning' },
    },
    {
      onAction: (action) => {
        // Opens the page as a first visit would: intro, random starter, every hint
        if (action === 'firstVisit') {
          localStorage.removeItem('pattern-maker:design')
          localStorage.removeItem('pattern-maker:learned')
        } else if (action === 'resetTuning') localStorage.removeItem('dialkit:tuning')
        else return
        location.reload()
      },
    },
  )

  useEffect(() => {
    useTuning.setState(values, true)
  }, [values])

  // Only load when a sample is picked, so saved work isn't replaced on load
  const loadedSample = useRef(sample)
  useEffect(() => {
    if (sample === loadedSample.current) return
    loadedSample.current = sample
    useApp.getState().loadDesign(SAMPLES[sample as SampleName])
  }, [sample])

  return <DialRoot position="bottom-right" defaultOpen={false} />
}

export default TuningPanel
