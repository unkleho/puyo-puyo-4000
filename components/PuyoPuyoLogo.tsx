export const PuyoPuyoLogo = ({ fontSize = '1.15em' }) => {
  return (
    <h1
      className="mt-[-0.2em] ml-[-0.1em] uppercase leading-none tracking-widest"
      style={{
        fontSize,
        width: '2.7em',
      }}
    >
      Puyo Puyo
      <span className="flex items-center justify-between">
        <span className="" style={{ fontSize: '0.5em', marginLeft: '0.1em' }}>
          ◣
        </span>
        <span
          className="mr-[-0.2em] mt-[0.1em] block text-right text-stone-500"
          style={{
            fontSize: '0.7em',
          }}
        >
          4000
        </span>
      </span>
    </h1>
  );
};
