'use client'

import React, { useState, useEffect } from 'react'
import { Input } from './input'

interface MoneyInputProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  name?: string
}

export function MoneyInput({ value, onChange, disabled, name }: MoneyInputProps) {
  // value is expected to be the total amount in Liras (e.g. 1500.50)
  
  // Initialize state based on value
  const [liraStr, setLiraStr] = useState('')
  const [kurusStr, setKurusStr] = useState('')

  useEffect(() => {
    // Only update internal state if it differs significantly to prevent cursor jumping
    // We parse back the strings to number to compare
    const currentVal = parseInternalValue(liraStr, kurusStr)
    if (value !== currentVal) {
      if (value === 0 || isNaN(value)) {
        setLiraStr('')
        setKurusStr('')
      } else {
        const lira = Math.floor(value)
        const kurus = Math.round((value - lira) * 100)
        
        setLiraStr(lira.toString())
        setKurusStr(kurus > 0 ? kurus.toString().padStart(2, '0') : '')
      }
    }
  }, [value]) // We only want this to run when the external value changes via props, not our internal state changes

  const parseInternalValue = (lira: string, kurus: string) => {
    const parsedLira = parseInt(lira.replace(/\D/g, '') || '0', 10)
    const parsedKurus = parseInt(kurus.replace(/\D/g, '') || '0', 10)
    
    // Kurus cannot be > 99 logically but user might type '100', if they do it should be clamped, but let's just use it as is for calculation
    const kurusValue = Math.min(parsedKurus, 99)
    
    return parsedLira + (kurusValue / 100)
  }

  const handleLiraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '')
    setLiraStr(rawVal)
    const newVal = parseInternalValue(rawVal, kurusStr)
    onChange(newVal)
  }

  const handleKurusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawVal = e.target.value.replace(/\D/g, '')
    // limit to 2 digits
    if (rawVal.length > 2) {
      rawVal = rawVal.slice(0, 2)
    }
    setKurusStr(rawVal)
    const newVal = parseInternalValue(liraStr, rawVal)
    onChange(newVal)
  }

  return (
    <div className="flex items-center gap-2">
      {name && <input type="hidden" name={name} value={value} />}
      <div className="relative flex-1">
        <Input
          type="text"
          inputMode="numeric"
          value={liraStr}
          onChange={handleLiraChange}
          placeholder="0"
          disabled={disabled}
          className="text-right pr-8 font-tabular-nums"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
          TL
        </span>
      </div>
      <span className="text-muted-foreground font-bold text-lg">,</span>
      <div className="w-20 shrink-0">
        <Input
          type="text"
          inputMode="numeric"
          value={kurusStr}
          onChange={handleKurusChange}
          placeholder="00"
          disabled={disabled}
          maxLength={2}
          className="font-tabular-nums text-center"
        />
      </div>
    </div>
  )
}
