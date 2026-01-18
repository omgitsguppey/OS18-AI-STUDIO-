import React, { useState } from 'react';

const Calculator: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState(true);

  const handleNumber = (num: string) => {
    if (newNumber) {
      setDisplay(num);
      setNewNumber(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleOperator = (op: string) => {
    const current = parseFloat(display);
    if (prevValue === null) {
      setPrevValue(current);
    } else if (operator) {
      const result = calculate(prevValue, current, operator);
      setPrevValue(result);
      setDisplay(String(result));
    }
    setOperator(op);
    setNewNumber(true);
  };

  const calculate = (a: number, b: number, op: string) => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '×': return a * b;
      case '÷': return a / b;
      default: return b;
    }
  };

  const handleEqual = () => {
    if (operator && prevValue !== null) {
      const current = parseFloat(display);
      const result = calculate(prevValue, current, operator);
      setDisplay(String(result));
      setPrevValue(null);
      setOperator(null);
      setNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setNewNumber(true);
  };

  const btnClass = "h-16 rounded-full text-2xl font-medium transition-all active:scale-95 flex items-center justify-center select-none";
  const darkBtn = "bg-[#333333] text-white hover:bg-[#444]";
  const orangeBtn = "bg-[#ff9f0a] text-white hover:bg-[#ffb23f]";
  const grayBtn = "bg-[#a5a5a5] text-black hover:bg-[#d4d4d2]";

  return (
    <div className="h-full bg-black flex flex-col p-4">
      <div className="flex-1 flex items-end justify-end p-6">
        <span className="text-7xl font-light text-white tracking-tight truncate">{display}</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <button onClick={handleClear} className={`${btnClass} ${grayBtn}`}>AC</button>
        <button onClick={() => {}} className={`${btnClass} ${grayBtn}`}>+/-</button>
        <button onClick={() => {}} className={`${btnClass} ${grayBtn}`}>%</button>
        <button onClick={() => handleOperator('÷')} className={`${btnClass} ${orangeBtn}`}>÷</button>
        
        <button onClick={() => handleNumber('7')} className={`${btnClass} ${darkBtn}`}>7</button>
        <button onClick={() => handleNumber('8')} className={`${btnClass} ${darkBtn}`}>8</button>
        <button onClick={() => handleNumber('9')} className={`${btnClass} ${darkBtn}`}>9</button>
        <button onClick={() => handleOperator('×')} className={`${btnClass} ${orangeBtn}`}>×</button>

        <button onClick={() => handleNumber('4')} className={`${btnClass} ${darkBtn}`}>4</button>
        <button onClick={() => handleNumber('5')} className={`${btnClass} ${darkBtn}`}>5</button>
        <button onClick={() => handleNumber('6')} className={`${btnClass} ${darkBtn}`}>6</button>
        <button onClick={() => handleOperator('-')} className={`${btnClass} ${orangeBtn}`}>-</button>

        <button onClick={() => handleNumber('1')} className={`${btnClass} ${darkBtn}`}>1</button>
        <button onClick={() => handleNumber('2')} className={`${btnClass} ${darkBtn}`}>2</button>
        <button onClick={() => handleNumber('3')} className={`${btnClass} ${darkBtn}`}>3</button>
        <button onClick={() => handleOperator('+')} className={`${btnClass} ${orangeBtn}`}>+</button>

        <button onClick={() => handleNumber('0')} className={`${btnClass} ${darkBtn} col-span-2 pl-8 justify-start`}>0</button>
        <button onClick={() => handleNumber('.')} className={`${btnClass} ${darkBtn}`}>.</button>
        <button onClick={handleEqual} className={`${btnClass} ${orangeBtn}`}>=</button>
      </div>
    </div>
  );
};

export default Calculator;