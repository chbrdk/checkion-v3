import { LoadingText } from '@msqdx/ui'

/** Instant feedback while RSC pages resolve — shell stays mounted from (app)/layout. */
export default function AppLoading() {
  return (
    <div
      className="checkion-stage-loading"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh',
      }}
    >
      <LoadingText>Loading…</LoadingText>
    </div>
  )
}
