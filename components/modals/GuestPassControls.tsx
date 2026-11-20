'use client';

import {
  Button, Calendar, CalendarCell, CalendarGrid, CalendarGridBody, CalendarGridHeader,
  CalendarHeaderCell, DateInput, DatePicker, DateSegment, Dialog, Group, Heading,
  Label, ListBox, ListBoxItem, Popover, Select, SelectValue,
} from 'react-aria-components';
import { parseDate } from '@internationalized/date';
import { IconCalendar, IconDoor } from '../common/Icons';
import styles from './PreApproveGuestModal.module.css';

export function GuestPassDatePicker({ id, label, value, min, max, disabled, onChange }: {
  id: string; label: string; value: string; min: string; max?: string; disabled: boolean; onChange: (date: string) => void;
}) {
  return <DatePicker id={id} className={styles.datePicker} value={parseDate(value)} minValue={parseDate(min)} maxValue={max ? parseDate(max) : undefined} isDisabled={disabled}
    onChange={date => { if (date) onChange(date.toString()); }} isRequired>
    <Label className={styles.label}>{label}</Label>
    <Group className={styles.dateControl}>
      <DateInput className={styles.dateInput}>{segment => <DateSegment segment={segment} className={styles.dateSegment} />}</DateInput>
      <Button className={styles.calendarButton} aria-label={`Choose ${label.toLowerCase()}`}><IconCalendar size={18} /></Button>
    </Group>
    <Popover className={styles.popover} offset={8} placement="top start">
      <Dialog className={styles.calendarDialog}>
        <Calendar className={styles.calendar}>
          <header className={styles.calendarHeader}>
            <Button slot="previous" className={styles.calendarNav}>‹</Button>
            <Heading />
            <Button slot="next" className={styles.calendarNav}>›</Button>
          </header>
          <CalendarGrid className={styles.calendarGrid}>
            <CalendarGridHeader>{day => <CalendarHeaderCell className={styles.weekday}>{day}</CalendarHeaderCell>}</CalendarGridHeader>
            <CalendarGridBody>{date => <CalendarCell date={date} className={styles.calendarCell} />}</CalendarGridBody>
          </CalendarGrid>
        </Calendar>
      </Dialog>
    </Popover>
  </DatePicker>;
}

export function GuestPassGateSelect({ value, options, disabled, onChange }: {
  value: string; options: string[]; disabled: boolean; onChange: (gate: string) => void;
}) {
  return <Select className={styles.gateSelect} value={value} onChange={key => { if (key !== null) onChange(String(key)); }} isDisabled={disabled}>
    <Label className={styles.label}>Authorized Entry Gate</Label>
    <Button id="guest-gate-select" className={styles.selectButton}>
      <IconDoor size={18} /><SelectValue className={styles.selectValue} /><span aria-hidden="true">⌄</span>
    </Button>
    <Popover className={`${styles.popover} ${styles.selectPopover}`} offset={8} placement="top start">
      <ListBox className={styles.gateList} aria-label="Authorized entry gates">
        {options.map(gate => <ListBoxItem id={gate} key={gate} textValue={gate} className={styles.gateOption}>
          {({ isSelected }) => <><span>{gate}</span><span aria-hidden="true">{isSelected ? '✓' : ''}</span></>}
        </ListBoxItem>)}
      </ListBox>
    </Popover>
  </Select>;
}
