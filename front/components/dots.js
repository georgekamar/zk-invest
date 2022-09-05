import { useEffect, useState, useRef } from 'react';


export default function DotsComponent(props) {

  const [dots, _setDots] = useState('');
  const dotsRef = useRef(dots);
  const setDots = (x) => {
    dotsRef.current = x;
    _setDots(x);
  }

  useEffect(() => {
    const interval = setInterval(() => {
      switch (dotsRef.current) {
        case '':
          setDots('.');
          break;
        case '.':
          setDots('..');
          break;
        case '..':
          setDots('...');
          break;
        default:
          setDots('');
          break;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [])

  return (
    <span>{dots}</span>
  )

}
