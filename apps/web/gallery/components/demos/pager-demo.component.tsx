import { PagerArrows, PagerTrack, Section, usePagedScroll } from '@fincheck/ui';

const SLIDES = ['Roxinho', 'Black', 'Platinum', 'Gold', 'Infinite'];

/** Five slides on a track with its arrows in the title line: the pager as the card section uses it. */
export function PagerDemo() {
  const pager = usePagedScroll();

  return (
    <Section
      title="Cartões de crédito"
      divider={false}
      action={
        <PagerArrows
          previousLabel="Cartões anteriores"
          nextLabel="Próximos cartões"
          onPrevious={pager.goBack}
          onNext={pager.goForward}
          isPreviousDisabled={!pager.canGoBack}
          isNextDisabled={!pager.canGoForward}
        />
      }
    >
      <PagerTrack trackRef={pager.trackRef} label="Exemplo de cartões">
        {SLIDES.map((name) => (
          <div
            key={name}
            className="glass grid h-32 place-items-center text-body text-fg-secondary"
          >
            {name}
          </div>
        ))}
      </PagerTrack>
    </Section>
  );
}
