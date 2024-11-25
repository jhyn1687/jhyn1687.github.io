import { useEffect, useState } from 'react';
import { animateScroll as scroll } from 'react-scroll';

function Header() {
  const [show, setShow] = useState(false);
  const scrollTrigger = () => {
    if (window.scrollY > window.innerHeight / 2) {
      setShow(true);
    } else {
      setShow(false);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', scrollTrigger);
    return () => {
      window.removeEventListener('scroll', scrollTrigger);
    };
  }, []);

  return (
    <div className={`header ${show && 'header-active'}`}>
      <svg
        id='Header-Signature'
        preserveAspectRatio='xMidYMid meet'
        viewBox='0 0 675 225'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path
          d='M5.99976 49.4226C60.4686 22.5301 140.427 45.3096 155.657 28.8578C174.695 8.29296 170.993 -4.36229 155.657 17.2571C140.321 38.8765 95.8998 113.226 118.639 145.391C126.468 156.465 151.356 157.323 169.406 102.153C193.732 27.8029 133.446 142.755 173.108 145.391C201.074 147.25 208.539 83.1696 188.973 76.3147C172.729 70.6238 206.953 86.8611 210.655 91.0795C217.133 98.462 226.519 107.425 220.702 140.118C212.77 167.01 230.538 76.2093 242.384 77.8966C257.191 80.0058 228.635 140.118 253.489 140.118C278.344 140.118 279.93 97.9341 279.93 77.8966C279.93 57.8591 265.498 143.835 291.565 136.955C309.545 132.209 320.712 96.3526 326 73.6786C331.288 51.0046 289.5 216 253.489 218.687C233.575 220.172 251.76 197.465 265 188C282.98 175.146 365.991 105.844 384.5 73.6786C398.765 48.8879 366.658 142.227 391.512 140.118C416.367 138.009 424.259 52.5864 425.357 65.2417C430.117 120.081 404.204 211.304 374.59 211.304C344.976 211.304 449.202 79.9586 456.606 69.4203C465.596 44.6371 407.84 169.242 472.47 105.804C480.403 98.0178 483.681 81.2319 486.22 69.4203C489.393 54.6558 453.433 117.932 480.403 124.259C490.5 126.628 498.552 117.948 500 102.153C503 69.4203 549.5 41 545.5 86.5C541.756 129.091 500 137.652 500 113C500 61.7417 565.5 25.5 545.5 130.5C544.271 136.955 572.5 111.763 572.5 86.5C572.5 64.8408 579.5 53.6728 579.5 119C579.5 156.965 583.5 102.437 592 73.6786C595.47 61.9369 612.8 67.1962 619 86.5C621.311 93.6962 619 130.5 630 130.5C641 130.5 659 111 669 100'
          stroke='white'
          strokeWidth='11'
          strokeLinecap='round'
        />
      </svg>
      <svg id='Header-Logo' width='27' height='37' viewBox='0 0 27 37' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <rect
          x='1.57135'
          y='0.931152'
          width='18.5185'
          height='2.22222'
          transform='rotate(45 1.57135 0.931152)'
          fill='white'
        />
        <rect
          x='11.5556'
          y='14.0257'
          width='18.5185'
          height='2.22222'
          transform='rotate(-45 11.5556 14.0257)'
          fill='white'
        />
        <rect
          x='1.57135'
          y='6.85708'
          width='18.5185'
          height='2.22222'
          transform='rotate(45 1.57135 6.85708)'
          fill='white'
        />
        <rect
          x='11.5556'
          y='19.9517'
          width='18.5185'
          height='2.22222'
          transform='rotate(-45 11.5556 19.9517)'
          fill='white'
        />
        <rect x='12' y='36.9312' width='18.5185' height='2.22222' transform='rotate(-90 12 36.9312)' fill='white' />
        <rect
          x='6.07407'
          y='32.1904'
          width='18.5185'
          height='2.22222'
          transform='rotate(-90 6.07407 32.1904)'
          fill='white'
        />
        <rect
          x='17.9259'
          y='32.1904'
          width='18.5185'
          height='2.22222'
          transform='rotate(-90 17.9259 32.1904)'
          fill='white'
        />
      </svg>
    </div>
  );
}

export default Header;
