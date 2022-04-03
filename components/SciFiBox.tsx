import React from 'react';

export type BorderType = 'normal' | 'hide';

export type CornerBorderType =
  | BorderType
  | 'corner'
  | 'top'
  | 'right'
  | 'bottom'
  | 'left';

export type Borders = {
  top?: BorderType;
  topRight?: CornerBorderType;
  right?: BorderType;
  bottomRight?: CornerBorderType;
  bottom?: BorderType;
  bottomLeft?: CornerBorderType;
  left?: BorderType;
  topLeft?: CornerBorderType;
};

type Props = {
  borderColour?: string;
  borders?: Borders;
  className?: string;
};

const defaultBorders: Borders = {
  top: 'normal',
  topRight: 'normal',
  right: 'normal',
  bottomRight: 'normal',
  bottom: 'normal',
  bottomLeft: 'normal',
  left: 'normal',
  topLeft: 'normal',
};

export const SciFiBox: React.FC<Props> = ({
  borderColour = 'border-stone-700',
  borders = defaultBorders,
  className,
}) => {
  borders = {
    ...defaultBorders,
    ...borders,
  };

  const borderPositions: {
    position: keyof Borders;
    borderClassName: string;
    cornerClassName?: string;
    topCornerClassName?: string;
    bottomCornerClassName?: string;
  }[] = [
    { position: 'top', borderClassName: 'box-top border-t' },
    {
      position: 'topRight',
      borderClassName:
        '-ml-[0.4rem] mt-[0.4rem] w-[1.41rem] rotate-45 border-t',
      cornerClassName: 'border-t border-r',
      topCornerClassName: 'border-t',
    },
    { position: 'right', borderClassName: 'border-r' },
    {
      position: 'bottomRight',
      borderClassName:
        '-ml-[0.4rem] mb-[0.4rem] w-[1.41rem] -rotate-45 border-b',
      cornerClassName: 'border-r border-b',
      bottomCornerClassName: 'border-b',
    },
    { position: 'bottom', borderClassName: 'box-bottom border-b' },
    {
      position: 'bottomLeft',
      borderClassName:
        '-mr-[0.4rem] mb-[0.4rem] w-[1.41rem] rotate-45 border-b',
      cornerClassName: 'border-b border-l',
      bottomCornerClassName: 'border-b',
    },
    { position: 'left', borderClassName: 'border-l' },
    {
      position: 'topLeft',
      borderClassName:
        '-ml-[0.4rem] mb-[0.4rem] w-[1.41rem] -rotate-45 border-b',
      cornerClassName: 'border-t border-l',
      topCornerClassName: 'border-t',
    },
  ];

  return (
    <span className={['box block h-full', className || ''].join(' ')}>
      {borderPositions.map(
        (
          {
            position,
            borderClassName,
            cornerClassName,
            topCornerClassName,
            bottomCornerClassName,
          },
          i,
        ) => {
          if (borders[position] !== 'hide') {
            return (
              <span
                className={[
                  `box-${position}`,
                  borders[position] === 'normal' ? borderClassName : '',
                  borders[position] === 'corner' ? cornerClassName : '',
                  borders[position] === 'top' ? topCornerClassName : '',
                  borders[position] === 'bottom' ? bottomCornerClassName : '',
                  borderColour,
                ].join(' ')}
                key={i}
              ></span>
            );
          }
        },
      )}

      {/* <span className={['box-top border-t', borderColour].join(' ')}></span> */}
      {/* <span
        className={[
          'box-top-right -ml-[0.4rem] mt-[0.4rem] w-[1.41rem] rotate-45 border-t',
          borderColour,
        ].join(' ')}
      ></span>
      <span className={['box-right border-r', borderColour].join(' ')}></span>
      <span
        className={[
          'box-bottom-right -ml-[0.4rem] mb-[0.4rem] w-[1.41rem] -rotate-45 border-b',
          borderColour,
        ].join(' ')}
      ></span>
      <span className={['box-bottom border-b', borderColour].join(' ')}></span>
      <span
        className={[
          'box-bottom-left -mr-[0.4rem] mb-[0.4rem] w-[1.41rem] rotate-45 border-b',
          borderColour,
        ].join(' ')}
      ></span>
      <span className={['box-left border-l', borderColour].join(' ')}></span>
      <span
        className={[
          'box-top-left -ml-[0.4rem] mb-[0.4rem] w-[1.41rem] -rotate-45 border-b',
          borderColour,
        ].join(' ')}
      ></span> */}

      <style jsx>{`
        .box {
          display: grid;
          grid-template-areas:
            'top-left top top-right'
            'left middle right'
            'bottom-left bottom bottom-right';
          grid-template-columns: 1rem 1fr 1rem;
          grid-template-rows: 1rem 1fr 1rem;
        }

        // .box span {
        //   border-colour: var(--color-stone-700);
        // }

        .box-top {
          grid-area: top;
        }

        .box-topRight {
          grid-area: top-right;
        }

        .box-right {
          grid-area: right;
        }

        .box-bottomRight {
          grid-area: bottom-right;
        }

        .box-bottom {
          grid-area: bottom;
        }

        .box-bottomLeft {
          grid-area: bottom-left;
        }

        .box-left {
          grid-area: left;
        }

        .box-topLeft {
          grid-area: top-left;
        }
      `}</style>
    </span>
  );
};
