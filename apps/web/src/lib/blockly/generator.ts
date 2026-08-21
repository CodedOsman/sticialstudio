import * as Blockly from 'blockly';
import type { CodingCircuitSnapshot } from '@/lib/blockly/circuitAwareness';

function getCircuitSnapshot(): CodingCircuitSnapshot | undefined {
    if (typeof window === 'undefined') return undefined;
    return (window as any).__CIRCUIT_CODING_SNAPSHOT as CodingCircuitSnapshot | undefined;
}

function resolvePin(componentId: string, fallback = '2'): string {
    if (!componentId || componentId === 'NONE') return fallback;
    const snapshot = getCircuitSnapshot();
    if (!snapshot) return fallback;
    const component = snapshot.components.find((entry) => entry.componentId === componentId);
    return component?.primaryBoardPin || fallback;
}

function resolveNamedPin(componentId: string, pinId: string, fallback = '2'): string {
    if (!componentId || componentId === 'NONE') return fallback;
    const snapshot = getCircuitSnapshot();
    if (!snapshot) return fallback;
    const component = snapshot.components.find((entry) => entry.componentId === componentId);
    if (!component) return fallback;
    return component.pinMappings[pinId]?.boardPinLabel || fallback;
}

function looksLikeBoardPin(value: string) {
    return /^(?:A\d+|\d+|D\d+|GPIO\d+|GP\d+)$/i.test(value);
}

function sanitizeIdentifier(value: string, fallbackPrefix = 'device') {
    const cleaned = String(value || '').replace(/[^A-Za-z0-9_]/g, '_');
    if (!cleaned) return fallbackPrefix;
    return /^[A-Za-z_]/.test(cleaned) ? cleaned : `${fallbackPrefix}_${cleaned}`;
}

function resolveComponentOrPin(value: string, fallback = '2') {
    if (!value || value === 'NONE') return fallback;
    if (looksLikeBoardPin(value)) return value;
    return resolvePin(value, fallback);
}

function resolveComponentNamedPinOrPin(value: string, pinId: string, fallback = '2') {
    if (!value || value === 'NONE') return fallback;
    if (looksLikeBoardPin(value)) return value;
    return resolveNamedPin(value, pinId, fallback);
}

function getInstanceIdentifier(rawValue: string, prefix: string, fallbackPin = '2') {
    if (!rawValue || rawValue === 'NONE') {
        return `${prefix}_${sanitizeIdentifier(fallbackPin, prefix)}`;
    }
    if (looksLikeBoardPin(rawValue)) {
        return `${prefix}_${sanitizeIdentifier(rawValue, prefix)}`;
    }
    return sanitizeIdentifier(rawValue, prefix);
}

// ----------------------------------------------------------------------------
// 1. ARDUINO C++ GENERATOR
// ----------------------------------------------------------------------------
export const arduinoGenerator = new Blockly.CodeGenerator('Arduino');
arduinoGenerator.INDENT = '  ';

(arduinoGenerator as any).init = function (workspace: Blockly.Workspace) {
    (this as any).setups_ = Object.create(null);
    (this as any).loops_ = Object.create(null);
};

(arduinoGenerator as any).finish = function (code: string) {
    // We do NOT wrap the code anymore, the template system handles it
    return code;
};

(arduinoGenerator as any).scrub_ = function (block: Blockly.Block, code: string, opt_thisOnly?: boolean): string {
    const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
    const nextCode = opt_thisOnly ? '' : this.blockToCode(nextBlock);
    return code + nextCode;
};

// -- Arduino Blocks --
(arduinoGenerator as any).forBlock['arduino_pinMode'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const mode = block.getFieldValue('MODE');
    (arduinoGenerator as any).setups_[`pinMode_${pin}`] = `  pinMode(${pin}, ${mode});`;
    return '';
};

(arduinoGenerator as any).forBlock['arduino_digitalWrite'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const state = block.getFieldValue('STATE');
    return `  digitalWrite(${pin}, ${state});\n`;
};

(arduinoGenerator as any).forBlock['arduino_board_led'] = function (block: Blockly.Block) {
    const state = block.getFieldValue('STATE') || 'LOW';
    (arduinoGenerator as any).setups_['board_led_pin'] = '  pinMode(LED_BUILTIN, OUTPUT);';
    return `  digitalWrite(LED_BUILTIN, ${state});\n`;
};

function getArduinoLedPin(block: Blockly.Block) {
    const rawSensor = block.getFieldValue('SENSOR') || block.getFieldValue('PIN') || '2';
    return resolveComponentNamedPinOrPin(rawSensor, 'SIG', resolveComponentOrPin(rawSensor, '2'));
}

(arduinoGenerator as any).forBlock['arduino_led_set'] = function (block: Blockly.Block) {
    const pin = getArduinoLedPin(block);
    const state = block.getFieldValue('STATE') || 'LOW';
    (arduinoGenerator as any).setups_[`led_pin_${pin}`] = `  pinMode(${pin}, OUTPUT);`;
    return `  digitalWrite(${pin}, ${state});\n`;
};
(arduinoGenerator as any).forBlock['arduino_delay'] = function (block: Blockly.Block) {
    const ms = block.getFieldValue('MS');
    return `  delay(${ms});\n`;
};

(arduinoGenerator as any).forBlock['time_delay'] = function (block: Blockly.Block) {
    const ms = (arduinoGenerator as any).valueToCode(block, 'MS', (arduinoGenerator as any).ORDER_NONE) || '1000';
    return `  delay(${ms});\n`;
};

(arduinoGenerator as any).forBlock['time_wait_seconds'] = function (block: Blockly.Block) {
    const seconds = (arduinoGenerator as any).valueToCode(block, 'SECONDS', (arduinoGenerator as any).ORDER_NONE) || '1';
    return `  delay((${seconds}) * 1000);\n`;
};

(arduinoGenerator as any).forBlock['time_wait_until'] = function (block: Blockly.Block) {
    const condition = (arduinoGenerator as any).valueToCode(block, 'BOOL', (arduinoGenerator as any).ORDER_NONE) || 'false';
    return `  while (!(${condition})) {\n    delay(1);\n  }\n`;
};

(arduinoGenerator as any).forBlock['arduino_digitalRead'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    return [`digitalRead(${pin})`, (arduinoGenerator as any).ORDER_ATOMIC];
};

(arduinoGenerator as any).forBlock['arduino_analogRead'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    return [`analogRead(${pin})`, (arduinoGenerator as any).ORDER_ATOMIC];
};

(arduinoGenerator as any).forBlock['arduino_analogWrite'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const value = (arduinoGenerator as any).valueToCode(block, 'VALUE', (arduinoGenerator as any).ORDER_NONE) || '0';
    return `  analogWrite(${pin}, ${value});\n`;
};

(arduinoGenerator as any).forBlock['arduino_millis'] = function (block: Blockly.Block) {
    return [`millis()`, (arduinoGenerator as any).ORDER_ATOMIC];
};

(arduinoGenerator as any).forBlock['arduino_serialPrint'] = function (block: Blockly.Block) {
    const text = (arduinoGenerator as any).valueToCode(block, 'TEXT', (arduinoGenerator as any).ORDER_NONE) || '""';
    const baud = block.getFieldValue('BAUD') || '9600';
    (arduinoGenerator as any).setups_['serial_begin'] = `  Serial.begin(${baud});`;
    return `  Serial.print(${text});\n`;
};

(arduinoGenerator as any).forBlock['arduino_serialPrintln'] = function (block: Blockly.Block) {
    const text = (arduinoGenerator as any).valueToCode(block, 'TEXT', (arduinoGenerator as any).ORDER_NONE) || '""';
    const baud = block.getFieldValue('BAUD') || '9600';
    (arduinoGenerator as any).setups_['serial_begin'] = `  Serial.begin(${baud});`;
    return `  Serial.println(${text});\n`;
};

(arduinoGenerator as any).forBlock['arduino_serialBegin'] = function (block: Blockly.Block) {
    const baud = block.getFieldValue('BAUD') || '9600';
    (arduinoGenerator as any).setups_['serial_begin'] = `  Serial.begin(${baud});`;
    return '';
};

(arduinoGenerator as any).forBlock['arduino_hc05_init'] = function (block: Blockly.Block) {
    const rx = block.getFieldValue('RX') || '10';
    const tx = block.getFieldValue('TX') || '11';
    const baud = block.getFieldValue('BAUD') || '9600';
    (arduinoGenerator as any).setups_['hc05_global'] = `#include <SoftwareSerial.h>\nSoftwareSerial hc05(${rx}, ${tx});`;
    (arduinoGenerator as any).setups_['hc05_begin'] = `  hc05.begin(${baud});`;
    return '';
};

(arduinoGenerator as any).forBlock['arduino_hc05_send'] = function (block: Blockly.Block) {
    const text = (arduinoGenerator as any).valueToCode(block, 'TEXT', (arduinoGenerator as any).ORDER_NONE) || '""';
    if (!(arduinoGenerator as any).setups_['hc05_global']) {
        (arduinoGenerator as any).setups_['hc05_global'] = '#include <SoftwareSerial.h>\nSoftwareSerial hc05(10, 11);';
    }
    if (!(arduinoGenerator as any).setups_['hc05_begin']) {
        (arduinoGenerator as any).setups_['hc05_begin'] = '  hc05.begin(9600);';
    }
    return `  hc05.println(${text});\n`;
};

(arduinoGenerator as any).forBlock['arduino_hc05_available'] = function () {
    if (!(arduinoGenerator as any).setups_['hc05_global']) {
        (arduinoGenerator as any).setups_['hc05_global'] = '#include <SoftwareSerial.h>\nSoftwareSerial hc05(10, 11);';
    }
    if (!(arduinoGenerator as any).setups_['hc05_begin']) {
        (arduinoGenerator as any).setups_['hc05_begin'] = '  hc05.begin(9600);';
    }
    return ['hc05.available()', (arduinoGenerator as any).ORDER_ATOMIC];
};

(arduinoGenerator as any).forBlock['arduino_hc05_read_byte'] = function () {
    if (!(arduinoGenerator as any).setups_['hc05_global']) {
        (arduinoGenerator as any).setups_['hc05_global'] = '#include <SoftwareSerial.h>\nSoftwareSerial hc05(10, 11);';
    }
    if (!(arduinoGenerator as any).setups_['hc05_begin']) {
        (arduinoGenerator as any).setups_['hc05_begin'] = '  hc05.begin(9600);';
    }
    return ['hc05.read()', (arduinoGenerator as any).ORDER_ATOMIC];
};
(arduinoGenerator as any).forBlock['arduino_servo_write'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const angle = (arduinoGenerator as any).valueToCode(block, 'ANGLE', (arduinoGenerator as any).ORDER_NONE) || '90';
    (arduinoGenerator as any).setups_['include_servo'] = `#include <Servo.h>\nServo servo_${pin};`;
    (arduinoGenerator as any).setups_[`servo_attach_${pin}`] = `  servo_${pin}.attach(${pin});`;
    return `  servo_${pin}.write(${angle});\n`;
};

(arduinoGenerator as any).forBlock['arduino_ultrasonic'] = function (block: Blockly.Block) {
    const trig = block.getFieldValue('TRIG');
    const echo = block.getFieldValue('ECHO');
    (arduinoGenerator as any).setups_['ultrasonic_func'] = `long readUltrasonicDistance(int triggerPin, int echoPin) {\n  pinMode(triggerPin, OUTPUT);\n  digitalWrite(triggerPin, LOW);\n  delayMicroseconds(2);\n  digitalWrite(triggerPin, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(triggerPin, LOW);\n  pinMode(echoPin, INPUT);\n  return pulseIn(echoPin, HIGH) * 0.01723;\n}`;
    return [`readUltrasonicDistance(${trig}, ${echo})`, (arduinoGenerator as any).ORDER_ATOMIC];
};

(arduinoGenerator as any).forBlock['arduino_relay_write'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const state = block.getFieldValue('STATE') || 'LOW';
    (arduinoGenerator as any).setups_[`relay_pin_${pin}`] = `  pinMode(${pin}, OUTPUT);`;
    return `  digitalWrite(${pin}, ${state});\n`;
};

(arduinoGenerator as any).forBlock['arduino_buzzer_tone'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const freq = (arduinoGenerator as any).valueToCode(block, 'FREQ', (arduinoGenerator as any).ORDER_NONE) || '1000';
    const duration = (arduinoGenerator as any).valueToCode(block, 'DURATION', (arduinoGenerator as any).ORDER_NONE) || '250';
    (arduinoGenerator as any).setups_[`buzzer_pin_${pin}`] = `  pinMode(${pin}, OUTPUT);`;
    return `  tone(${pin}, ${freq}, ${duration});\n`;
};

(arduinoGenerator as any).forBlock['arduino_tone_pin'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const freq = (arduinoGenerator as any).valueToCode(block, 'FREQ', (arduinoGenerator as any).ORDER_NONE) || '1000';
    (arduinoGenerator as any).setups_[`tone_pin_${pin}`] = `  pinMode(${pin}, OUTPUT);`;
    return `  tone(${pin}, ${freq});\n`;
};

(arduinoGenerator as any).forBlock['arduino_tone_pin_duration'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const freq = (arduinoGenerator as any).valueToCode(block, 'FREQ', (arduinoGenerator as any).ORDER_NONE) || '1000';
    const duration = (arduinoGenerator as any).valueToCode(block, 'DUR', (arduinoGenerator as any).ORDER_NONE) || '250';
    (arduinoGenerator as any).setups_[`tone_pin_${pin}`] = `  pinMode(${pin}, OUTPUT);`;
    return `  tone(${pin}, ${freq}, ${duration});\n`;
};
(arduinoGenerator as any).forBlock['arduino_buzzer_stop'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    (arduinoGenerator as any).setups_[`buzzer_pin_${pin}`] = `  pinMode(${pin}, OUTPUT);`;
    return `  noTone(${pin});\n`;
};

(arduinoGenerator as any).forBlock['arduino_no_tone_pin'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    (arduinoGenerator as any).setups_[`tone_pin_${pin}`] = `  pinMode(${pin}, OUTPUT);`;
    return `  noTone(${pin});\n`;
};
(arduinoGenerator as any).forBlock['arduino_pir_read'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    (arduinoGenerator as any).setups_[`pir_pin_${pin}`] = `  pinMode(${pin}, INPUT);`;
    return [`digitalRead(${pin})`, (arduinoGenerator as any).ORDER_ATOMIC];
};

(arduinoGenerator as any).forBlock['arduino_touch_read'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    (arduinoGenerator as any).setups_[`touch_pin_${pin}`] = `  pinMode(${pin}, INPUT);`;
    return [`digitalRead(${pin})`, (arduinoGenerator as any).ORDER_ATOMIC];
};

(arduinoGenerator as any).forBlock['arduino_soil_moisture_read'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    return [`analogRead(${pin})`, (arduinoGenerator as any).ORDER_ATOMIC];
};

(arduinoGenerator as any).forBlock['arduino_rain_read'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    return [`analogRead(${pin})`, (arduinoGenerator as any).ORDER_ATOMIC];
};

(arduinoGenerator as any).forBlock['arduino_water_level_read'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    return [`analogRead(${pin})`, (arduinoGenerator as any).ORDER_ATOMIC];
};

(arduinoGenerator as any).forBlock['arduino_ir_init'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN') || '2';
    (arduinoGenerator as any).setups_['ir_include'] = '#include <IRremote.hpp>';
    (arduinoGenerator as any).setups_['ir_begin'] = `  IrReceiver.begin(${pin}, ENABLE_LED_FEEDBACK);`;
    (arduinoGenerator as any).setups_['ir_helper'] = `unsigned long readIrCode() {\n  if (IrReceiver.decode()) {\n    unsigned long code = IrReceiver.decodedIRData.decodedRawData;\n    IrReceiver.resume();\n    return code;\n  }\n  return 0;\n}`;
    return '';
};

(arduinoGenerator as any).forBlock['arduino_ir_read_code'] = function () {
    if (!(arduinoGenerator as any).setups_['ir_include']) {
        (arduinoGenerator as any).setups_['ir_include'] = '#include <IRremote.hpp>';
    }
    if (!(arduinoGenerator as any).setups_['ir_begin']) {
        (arduinoGenerator as any).setups_['ir_begin'] = '  IrReceiver.begin(2, ENABLE_LED_FEEDBACK);';
    }
    if (!(arduinoGenerator as any).setups_['ir_helper']) {
        (arduinoGenerator as any).setups_['ir_helper'] = 'unsigned long readIrCode() {\n  if (IrReceiver.decode()) {\n    unsigned long code = IrReceiver.decodedIRData.decodedRawData;\n    IrReceiver.resume();\n    return code;\n  }\n  return 0;\n}';
    }
    return ['readIrCode()', (arduinoGenerator as any).ORDER_ATOMIC];
};

(arduinoGenerator as any).forBlock['arduino_keypad_init'] = function (block: Blockly.Block) {
    const r1 = block.getFieldValue('R1') || '9';
    const r2 = block.getFieldValue('R2') || '8';
    const r3 = block.getFieldValue('R3') || '7';
    const r4 = block.getFieldValue('R4') || '6';
    const c1 = block.getFieldValue('C1') || '5';
    const c2 = block.getFieldValue('C2') || '4';
    const c3 = block.getFieldValue('C3') || '3';
    const c4 = block.getFieldValue('C4') || '2';
    (arduinoGenerator as any).setups_['keypad_global'] = `#include <Keypad.h>\nconst byte KP_ROWS = 4;\nconst byte KP_COLS = 4;\nchar KP_KEYS[KP_ROWS][KP_COLS] = {\n  {'1','2','3','A'},\n  {'4','5','6','B'},\n  {'7','8','9','C'},\n  {'*','0','#','D'}\n};\nbyte kpRowPins[KP_ROWS] = {${r1}, ${r2}, ${r3}, ${r4}};\nbyte kpColPins[KP_COLS] = {${c1}, ${c2}, ${c3}, ${c4}};\nKeypad customKeypad = Keypad(makeKeymap(KP_KEYS), kpRowPins, kpColPins, KP_ROWS, KP_COLS);`;
    (arduinoGenerator as any).setups_['keypad_helper'] = `String readKeypadKey() {\n  char key = customKeypad.getKey();\n  if (key == NO_KEY) return String(\"\");\n  return String(key);\n}`;
    return '';
};

(arduinoGenerator as any).forBlock['arduino_keypad_get_key'] = function () {
    if (!(arduinoGenerator as any).setups_['keypad_global']) {
        (arduinoGenerator as any).setups_['keypad_global'] = '#include <Keypad.h>\nconst byte KP_ROWS = 4;\nconst byte KP_COLS = 4;\nchar KP_KEYS[KP_ROWS][KP_COLS] = {\n  {\'1\',\'2\',\'3\',\'A\'},\n  {\'4\',\'5\',\'6\',\'B\'},\n  {\'7\',\'8\',\'9\',\'C\'},\n  {\'*\',\'0\',\'#\',\'D\'}\n};\nbyte kpRowPins[KP_ROWS] = {9, 8, 7, 6};\nbyte kpColPins[KP_COLS] = {5, 4, 3, 2};\nKeypad customKeypad = Keypad(makeKeymap(KP_KEYS), kpRowPins, kpColPins, KP_ROWS, KP_COLS);';
    }
    if (!(arduinoGenerator as any).setups_['keypad_helper']) {
        (arduinoGenerator as any).setups_['keypad_helper'] = 'String readKeypadKey() {\n  char key = customKeypad.getKey();\n  if (key == NO_KEY) return String(\"\");\n  return String(key);\n}';
    }
    return ['readKeypadKey()', (arduinoGenerator as any).ORDER_ATOMIC];
};
(arduinoGenerator as any).forBlock['arduino_dht_init'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const type = block.getFieldValue('TYPE') || 'DHT11';
    (arduinoGenerator as any).setups_[`dht_global_${pin}`] = `#include <DHT.h>\nDHT dht_${pin}(${pin}, ${type});`;
    (arduinoGenerator as any).setups_[`dht_begin_${pin}`] = `  dht_${pin}.begin();`;
    return '';
};

(arduinoGenerator as any).forBlock['arduino_dht_read'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const type = block.getFieldValue('TYPE') || 'DHT11';
    const metric = block.getFieldValue('METRIC') || 'TEMP_C';
    (arduinoGenerator as any).setups_[`dht_global_${pin}`] = `#include <DHT.h>\nDHT dht_${pin}(${pin}, ${type});`;
    (arduinoGenerator as any).setups_[`dht_begin_${pin}`] = `  dht_${pin}.begin();`;
    const expression = metric === 'HUMIDITY' ? `dht_${pin}.readHumidity()` : `dht_${pin}.readTemperature()`;
    return [expression, (arduinoGenerator as any).ORDER_ATOMIC];
};

(arduinoGenerator as any).forBlock['arduino_bme280_init'] = function (block: Blockly.Block) {
    const address = block.getFieldValue('ADDRESS') || '0x76';
    (arduinoGenerator as any).setups_['bme280_global'] = '#include <Wire.h>\n#include <Adafruit_Sensor.h>\n#include <Adafruit_BME280.h>\nAdafruit_BME280 bme;';
    (arduinoGenerator as any).setups_['bme280_begin'] = `  bme.begin(${address});`;
    return '';
};

(arduinoGenerator as any).forBlock['arduino_bme280_read'] = function (block: Blockly.Block) {
    const metric = block.getFieldValue('METRIC') || 'TEMP_C';
    (arduinoGenerator as any).setups_['bme280_global'] = '#include <Wire.h>\n#include <Adafruit_Sensor.h>\n#include <Adafruit_BME280.h>\nAdafruit_BME280 bme;';
    (arduinoGenerator as any).setups_['bme280_begin'] = '  bme.begin(0x76);';
    let expression = 'bme.readTemperature()';
    if (metric === 'HUMIDITY') expression = 'bme.readHumidity()';
    if (metric === 'PRESSURE_HPA') expression = '(bme.readPressure() / 100.0F)';
    if (metric === 'ALTITUDE_M') expression = 'bme.readAltitude(1013.25)';
    return [expression, (arduinoGenerator as any).ORDER_ATOMIC];
};

(arduinoGenerator as any).forBlock['arduino_bh1750_init'] = function () {
    (arduinoGenerator as any).setups_['bh1750_global'] = '#include <Wire.h>\n#include <BH1750.h>\nBH1750 lightMeter;';
    (arduinoGenerator as any).setups_['bh1750_begin'] = '  Wire.begin();\n  lightMeter.begin();';
    return '';
};

(arduinoGenerator as any).forBlock['arduino_bh1750_read'] = function () {
    (arduinoGenerator as any).setups_['bh1750_global'] = '#include <Wire.h>\n#include <BH1750.h>\nBH1750 lightMeter;';
    (arduinoGenerator as any).setups_['bh1750_begin'] = '  Wire.begin();\n  lightMeter.begin();';
    return ['lightMeter.readLightLevel()', (arduinoGenerator as any).ORDER_ATOMIC];
};
(arduinoGenerator as any).forBlock['arduino_setup_loop'] = function (block: Blockly.Block) {
    const setupCode = (arduinoGenerator as any).statementToCode(block, 'SETUP') || '';
    const loopCode = (arduinoGenerator as any).statementToCode(block, 'LOOP') || '';
    (arduinoGenerator as any).setups_['__setup_code__'] = setupCode;
    (arduinoGenerator as any).setups_['__loop_code__'] = loopCode;
    return '';
};

(arduinoGenerator as any).forBlock['arduino_on_start'] = function (block: Blockly.Block) {
    const setupCode = (arduinoGenerator as any).statementToCode(block, 'SETUP') || '';
    const existing = (arduinoGenerator as any).setups_['__setup_code__'] || '';
    (arduinoGenerator as any).setups_['__setup_code__'] = existing + setupCode;
    return '';
};

(arduinoGenerator as any).forBlock['arduino_forever'] = function (block: Blockly.Block) {
    const loopCode = (arduinoGenerator as any).statementToCode(block, 'LOOP') || '';
    const existing = (arduinoGenerator as any).setups_['__loop_code__'] || '';
    (arduinoGenerator as any).setups_['__loop_code__'] = existing + loopCode;
    return '';
};

(arduinoGenerator as any).forBlock['oled_init'] = function (block: Blockly.Block) {
    const width = block.getFieldValue('WIDTH');
    const height = block.getFieldValue('HEIGHT');
    (arduinoGenerator as any).setups_['include_wire'] = '#include <Wire.h>';
    (arduinoGenerator as any).setups_['include_adafruit_gfx'] = '#include <Adafruit_GFX.h>';
    (arduinoGenerator as any).setups_['include_adafruit_ssd1306'] = '#include <Adafruit_SSD1306.h>';
    (arduinoGenerator as any).setups_['declare_display'] = `Adafruit_SSD1306 display(${width}, ${height}, &Wire, -1);`;
    (arduinoGenerator as any).setups_['init_display'] = `  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {\n    for(;;);\n  }\n  display.clearDisplay();\n  display.setTextColor(WHITE);`;
    return '';
};

(arduinoGenerator as any).forBlock['oled_clear'] = function (block: Blockly.Block) {
    return '  display.clearDisplay();\n  display.display();\n';
};

(arduinoGenerator as any).forBlock['oled_print'] = function (block: Blockly.Block) {
    const x = (arduinoGenerator as any).valueToCode(block, 'X', (arduinoGenerator as any).ORDER_NONE) || '0';
    const y = (arduinoGenerator as any).valueToCode(block, 'Y', (arduinoGenerator as any).ORDER_NONE) || '0';
    const text = (arduinoGenerator as any).valueToCode(block, 'TEXT', (arduinoGenerator as any).ORDER_NONE) || '""';
    return `  display.setCursor(${x}, ${y});\n  display.print(${text});\n  display.display();\n`;
};

(arduinoGenerator as any).forBlock['lcd_i2c_init'] = function (block: Blockly.Block) {
    const address = block.getFieldValue('ADDRESS') || '0x27';
    const cols = block.getFieldValue('COLS') || '16';
    const rows = block.getFieldValue('ROWS') || '2';
    (arduinoGenerator as any).setups_['lcd_i2c_global'] = `#include <Wire.h>\n#include <LiquidCrystal_I2C.h>\nLiquidCrystal_I2C lcd(${address}, ${cols}, ${rows});`;
    (arduinoGenerator as any).setups_['lcd_i2c_begin'] = '  lcd.init();\n  lcd.backlight();';
    return '';
};

(arduinoGenerator as any).forBlock['lcd_i2c_clear'] = function () {
    if (!(arduinoGenerator as any).setups_['lcd_i2c_global']) {
        (arduinoGenerator as any).setups_['lcd_i2c_global'] = '#include <Wire.h>\n#include <LiquidCrystal_I2C.h>\nLiquidCrystal_I2C lcd(0x27, 16, 2);';
    }
    if (!(arduinoGenerator as any).setups_['lcd_i2c_begin']) {
        (arduinoGenerator as any).setups_['lcd_i2c_begin'] = '  lcd.init();\n  lcd.backlight();';
    }
    return '  lcd.clear();\n';
};

(arduinoGenerator as any).forBlock['lcd_i2c_print'] = function (block: Blockly.Block) {
    const text = (arduinoGenerator as any).valueToCode(block, 'TEXT', (arduinoGenerator as any).ORDER_NONE) || '""';
    const col = (arduinoGenerator as any).valueToCode(block, 'COL', (arduinoGenerator as any).ORDER_NONE) || '0';
    const row = (arduinoGenerator as any).valueToCode(block, 'ROW', (arduinoGenerator as any).ORDER_NONE) || '0';
    if (!(arduinoGenerator as any).setups_['lcd_i2c_global']) {
        (arduinoGenerator as any).setups_['lcd_i2c_global'] = '#include <Wire.h>\n#include <LiquidCrystal_I2C.h>\nLiquidCrystal_I2C lcd(0x27, 16, 2);';
    }
    if (!(arduinoGenerator as any).setups_['lcd_i2c_begin']) {
        (arduinoGenerator as any).setups_['lcd_i2c_begin'] = '  lcd.init();\n  lcd.backlight();';
    }
    return `  lcd.setCursor(${col}, ${row});\n  lcd.print(${text});\n`;
};
(arduinoGenerator as any).forBlock['neopixel_init'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const count = block.getFieldValue('COUNT');
    (arduinoGenerator as any).setups_['include_neopixel'] = '#include <Adafruit_NeoPixel.h>';
    (arduinoGenerator as any).setups_[`declare_strip_${pin}`] = `Adafruit_NeoPixel pixels_${pin}(${count}, ${pin}, NEO_GRB + NEO_KHZ800);`;
    (arduinoGenerator as any).setups_[`init_strip_${pin}`] = `  pixels_${pin}.begin();`;
    return '';
};

(arduinoGenerator as any).forBlock['neopixel_set_color'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const index = (arduinoGenerator as any).valueToCode(block, 'INDEX', (arduinoGenerator as any).ORDER_NONE) || '0';
    const r = (arduinoGenerator as any).valueToCode(block, 'R', (arduinoGenerator as any).ORDER_NONE) || '0';
    const g = (arduinoGenerator as any).valueToCode(block, 'G', (arduinoGenerator as any).ORDER_NONE) || '0';
    const b = (arduinoGenerator as any).valueToCode(block, 'B', (arduinoGenerator as any).ORDER_NONE) || '0';
    return `  pixels_${pin}.setPixelColor(${index}, pixels_${pin}.Color(${r}, ${g}, ${b}));\n`;
};

(arduinoGenerator as any).forBlock['neopixel_show'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    return `  pixels_${pin}.show();\n`;
};

(arduinoGenerator as any).forBlock['neopixel_clear'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    return `  pixels_${pin}.clear();\n  pixels_${pin}.show();\n`;
};

(arduinoGenerator as any).forBlock['motor_forward'] = function (block: Blockly.Block) {
    const pin1 = block.getFieldValue('PIN1');
    const pin2 = block.getFieldValue('PIN2');
    const speed = (arduinoGenerator as any).valueToCode(block, 'SPEED', (arduinoGenerator as any).ORDER_NONE) || '255';
    (arduinoGenerator as any).setups_[`motor_pinMode_${pin1}`] = `  pinMode(${pin1}, OUTPUT);`;
    (arduinoGenerator as any).setups_[`motor_pinMode_${pin2}`] = `  pinMode(${pin2}, OUTPUT);`;
    return `  analogWrite(${pin1}, ${speed});\n  digitalWrite(${pin2}, LOW);\n`;
};

(arduinoGenerator as any).forBlock['motor_backward'] = function (block: Blockly.Block) {
    const pin1 = block.getFieldValue('PIN1');
    const pin2 = block.getFieldValue('PIN2');
    const speed = (arduinoGenerator as any).valueToCode(block, 'SPEED', (arduinoGenerator as any).ORDER_NONE) || '255';
    (arduinoGenerator as any).setups_[`motor_pinMode_${pin1}`] = `  pinMode(${pin1}, OUTPUT);`;
    (arduinoGenerator as any).setups_[`motor_pinMode_${pin2}`] = `  pinMode(${pin2}, OUTPUT);`;
    return `  digitalWrite(${pin1}, LOW);\n  analogWrite(${pin2}, ${speed});\n`;
};

(arduinoGenerator as any).forBlock['motor_stop'] = function (block: Blockly.Block) {
    const pin1 = block.getFieldValue('PIN1');
    const pin2 = block.getFieldValue('PIN2');
    (arduinoGenerator as any).setups_[`motor_pinMode_${pin1}`] = `  pinMode(${pin1}, OUTPUT);`;
    (arduinoGenerator as any).setups_[`motor_pinMode_${pin2}`] = `  pinMode(${pin2}, OUTPUT);`;
    return `  digitalWrite(${pin1}, LOW);\n  digitalWrite(${pin2}, LOW);\n`;
};

(arduinoGenerator as any).forBlock['arduino_l298n_drive'] = function (block: Blockly.Block) {
    const en = block.getFieldValue('EN');
    const in1 = block.getFieldValue('IN1');
    const in2 = block.getFieldValue('IN2');
    const dir = block.getFieldValue('DIR') || 'STOP';
    const speed = (arduinoGenerator as any).valueToCode(block, 'SPEED', (arduinoGenerator as any).ORDER_NONE) || '255';
    const pwm = `constrain(${speed}, 0, 255)`;

    (arduinoGenerator as any).setups_[`l298_en_${en}`] = `  pinMode(${en}, OUTPUT);`;
    (arduinoGenerator as any).setups_[`l298_in1_${in1}`] = `  pinMode(${in1}, OUTPUT);`;
    (arduinoGenerator as any).setups_[`l298_in2_${in2}`] = `  pinMode(${in2}, OUTPUT);`;

    if (dir === 'FORWARD') {
        return `  analogWrite(${en}, ${pwm});\n  digitalWrite(${in1}, HIGH);\n  digitalWrite(${in2}, LOW);\n`;
    }
    if (dir === 'REVERSE') {
        return `  analogWrite(${en}, ${pwm});\n  digitalWrite(${in1}, LOW);\n  digitalWrite(${in2}, HIGH);\n`;
    }
    if (dir === 'BRAKE') {
        return `  analogWrite(${en}, ${pwm});\n  digitalWrite(${in1}, HIGH);\n  digitalWrite(${in2}, HIGH);\n`;
    }
    return `  analogWrite(${en}, 0);\n  digitalWrite(${in1}, LOW);\n  digitalWrite(${in2}, LOW);\n`;
};
// -- Standard Blocks (Loops, Math, Text) --
(arduinoGenerator as any).ORDER_ATOMIC = 0;
(arduinoGenerator as any).ORDER_NONE = 99;

(arduinoGenerator as any).forBlock['math_number'] = function (block: Blockly.Block) {
    return [block.getFieldValue('NUM'), (arduinoGenerator as any).ORDER_ATOMIC];
};

(arduinoGenerator as any).forBlock['math_single'] = function (block: Blockly.Block) {
    const operator = block.getFieldValue('OP');
    const arg = (arduinoGenerator as any).valueToCode(block, 'NUM', (arduinoGenerator as any).ORDER_NONE) || '0';
    let code;
    if (operator === 'ROOT') code = `sqrt(${arg})`;
    else if (operator === 'ABS') code = `abs(${arg})`;
    else if (operator === 'NEG') code = `-${arg}`;
    else if (operator === 'LN') code = `log(${arg})`;
    else if (operator === 'LOG10') code = `log10(${arg})`;
    else if (operator === 'EXP') code = `exp(${arg})`;
    else if (operator === 'POW10') code = `pow(10, ${arg})`;
    else code = `(${arg})`;
    return [code, (arduinoGenerator as any).ORDER_ATOMIC];
};

(arduinoGenerator as any).forBlock['math_arithmetic'] = function (block: Blockly.Block) {
    const operator = block.getFieldValue('OP');
    const argument0 = (arduinoGenerator as any).valueToCode(block, 'A', (arduinoGenerator as any).ORDER_NONE) || '0';
    const argument1 = (arduinoGenerator as any).valueToCode(block, 'B', (arduinoGenerator as any).ORDER_NONE) || '0';

    if (operator === 'POWER') {
        return [`pow(${argument0}, ${argument1})`, (arduinoGenerator as any).ORDER_ATOMIC];
    }

    const operatorMap: Record<string, string> = {
        ADD: '+',
        MINUS: '-',
        MULTIPLY: '*',
        DIVIDE: '/'
    };
    const op = operatorMap[operator] || '+';
    return [`(${argument0} ${op} ${argument1})`, (arduinoGenerator as any).ORDER_ATOMIC];
};

(arduinoGenerator as any).forBlock['logic_boolean'] = function (block: Blockly.Block) {
    return [block.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false', (arduinoGenerator as any).ORDER_ATOMIC];
};

(arduinoGenerator as any).forBlock['logic_compare'] = function (block: Blockly.Block) {
    const operator = block.getFieldValue('OP');
    const argument0 = (arduinoGenerator as any).valueToCode(block, 'A', (arduinoGenerator as any).ORDER_NONE) || '0';
    const argument1 = (arduinoGenerator as any).valueToCode(block, 'B', (arduinoGenerator as any).ORDER_NONE) || '0';
    const operatorMap: Record<string, string> = {
        EQ: '==',
        NEQ: '!=',
        LT: '<',
        LTE: '<=',
        GT: '>',
        GTE: '>='
    };
    const op = operatorMap[operator] || '==';
    return [`(${argument0} ${op} ${argument1})`, (arduinoGenerator as any).ORDER_ATOMIC];
};

(arduinoGenerator as any).forBlock['logic_operation'] = function (block: Blockly.Block) {
    const operator = block.getFieldValue('OP');
    const argument0 = (arduinoGenerator as any).valueToCode(block, 'A', (arduinoGenerator as any).ORDER_NONE) || 'false';
    const argument1 = (arduinoGenerator as any).valueToCode(block, 'B', (arduinoGenerator as any).ORDER_NONE) || 'false';
    const op = operator === 'AND' ? '&&' : '||';
    return [`(${argument0} ${op} ${argument1})`, (arduinoGenerator as any).ORDER_ATOMIC];
};

(arduinoGenerator as any).forBlock['logic_negate'] = function (block: Blockly.Block) {
    const argument0 = (arduinoGenerator as any).valueToCode(block, 'BOOL', (arduinoGenerator as any).ORDER_NONE) || 'false';
    return [`(!(${argument0}))`, (arduinoGenerator as any).ORDER_ATOMIC];
};

(arduinoGenerator as any).forBlock['controls_if'] = function (block: Blockly.Block) {
    let n = 0;
    let code = '';

    do {
        const condition = (arduinoGenerator as any).valueToCode(block, `IF${n}`, (arduinoGenerator as any).ORDER_NONE) || 'false';
        const branch = (arduinoGenerator as any).statementToCode(block, `DO${n}`) || '';
        code += n === 0
            ? `  if (${condition}) {\n${branch}  }\n`
            : `  else if (${condition}) {\n${branch}  }\n`;
        n++;
    } while (block.getInput(`IF${n}`));

    if (block.getInput('ELSE')) {
        const elseBranch = (arduinoGenerator as any).statementToCode(block, 'ELSE') || '';
        code += `  else {\n${elseBranch}  }\n`;
    }

    return code;
};

(arduinoGenerator as any).forBlock['text_print'] = function (block: Blockly.Block) {
    const text = (arduinoGenerator as any).valueToCode(block, 'TEXT', (arduinoGenerator as any).ORDER_NONE) || '""';
    (arduinoGenerator as any).setups_['serial_begin'] = '  Serial.begin(9600);';
    return `  Serial.println(${text});\n`;
};

(arduinoGenerator as any).forBlock['controls_whileUntil'] = function (block: Blockly.Block) {
    const until = block.getFieldValue('MODE') === 'UNTIL';
    const argument0 = (arduinoGenerator as any).valueToCode(block, 'BOOL', (arduinoGenerator as any).ORDER_NONE) || 'false';
    const branch = (arduinoGenerator as any).statementToCode(block, 'DO') || '';
    if (until) {
        return `  while (!(${argument0})) {\n${branch}  }\n`;
    }
    return `  while (${argument0}) {\n${branch}  }\n`;
};

(arduinoGenerator as any).forBlock['controls_repeat_ext'] = function (block: Blockly.Block) {
    const repeats = (arduinoGenerator as any).valueToCode(block, 'TIMES', (arduinoGenerator as any).ORDER_NONE) || '0';
    const branch = (arduinoGenerator as any).statementToCode(block, 'DO') || '';
    return `  for (int count = 0; count < ${repeats}; count++) {\n${branch}  }\n`;
};

(arduinoGenerator as any).forBlock['text'] = function (block: Blockly.Block) {
    return ['"' + block.getFieldValue('TEXT') + '"', (arduinoGenerator as any).ORDER_ATOMIC];
};

// ----------------------------------------------------------------------------
// 2. MICROPYTHON GENERATOR
// ----------------------------------------------------------------------------
export const micropythonGenerator = new Blockly.CodeGenerator('MicroPython');
micropythonGenerator.INDENT = '    ';

function getMicroPythonState(generator: Blockly.CodeGenerator) {
    const state = generator as any;
    if (!state.imports_) {
        state.imports_ = new Set<string>();
    }
    if (!state.setups_) {
        state.setups_ = Object.create(null);
    }
    return state as { imports_: Set<string>; setups_: Record<string, string> };
}

(micropythonGenerator as any).init = function (workspace: Blockly.Workspace) {
    const state = getMicroPythonState(this as Blockly.CodeGenerator);
    state.imports_.clear();
    state.setups_ = Object.create(null);
};

(micropythonGenerator as any).finish = function (code: string) {
    // We do NOT wrap the code anymore, the template system handles it
    return code;
};

function getMicroPythonImports(generator: Blockly.CodeGenerator) {
    const state = getMicroPythonState(generator);
    const imports: string[] = [];

    if (state.imports_.has('machine')) imports.push('import machine');
    if (state.imports_.has('time')) imports.push('import time');
    if (state.imports_.has('math')) imports.push('import math');
    if (state.imports_.has('dht')) imports.push('import dht');
    if (state.imports_.has('bme280')) imports.push('import bme280');
    if (state.imports_.has('bh1750')) imports.push('import bh1750');
    if (state.imports_.has('ssd1306')) imports.push('import ssd1306');
    if (state.imports_.has('neopixel')) imports.push('import neopixel');
    if (state.imports_.has('pico_i2c_lcd')) imports.push('from pico_i2c_lcd import I2cLcd');

    return Array.from(new Set(imports));
}
(micropythonGenerator as any).getImports = function () {
    return getMicroPythonImports(this as Blockly.CodeGenerator);
};

function dedentMicroPython(code: string) {
    if (!code) return '';
    const indent = micropythonGenerator.INDENT || '    ';
    return code
        .split('\n')
        .map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line))
        .join('\n');
}
(micropythonGenerator as any).scrub_ = function (block: Blockly.Block, code: string, opt_thisOnly?: boolean): string {
    const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
    const nextCode = opt_thisOnly ? '' : this.blockToCode(nextBlock);
    return code + nextCode;
};

// -- MicroPython Blocks --
(micropythonGenerator as any).forBlock['arduino_pinMode'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const mode = block.getFieldValue('MODE') === 'OUTPUT' ? 'machine.Pin.OUT' : 'machine.Pin.IN';
    const state = getMicroPythonState(micropythonGenerator);
    state.imports_.add('machine');
    state.setups_[`pinMode_${pin}`] = `pin_${pin} = machine.Pin(${pin}, ${mode})`;
    return '';
};

(micropythonGenerator as any).forBlock['arduino_digitalWrite'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const state = block.getFieldValue('STATE') === 'HIGH' ? '1' : '0';
    return `pin_${pin}.value(${state})\n`;
};

(micropythonGenerator as any).forBlock['arduino_board_led'] = function (block: Blockly.Block) {
    const state = getMicroPythonState(micropythonGenerator);
    state.imports_.add('machine');
    state.setups_['board_led_helper'] = `def _sticial_board_led():
    for candidate in ("LED", 25, 2):
        try:
            return machine.Pin(candidate, machine.Pin.OUT)
        except Exception:
            pass
    raise RuntimeError("Built-in LED pin is not available on this board")`;
    state.setups_['board_led_init'] = 'board_led = _sticial_board_led()';
    return `board_led.value(${block.getFieldValue('STATE') === 'HIGH' ? '1' : '0'})\n`;
};

function getMicroPythonLedConfig(block: Blockly.Block) {
    const rawSensor = block.getFieldValue('SENSOR') || block.getFieldValue('PIN') || '2';
    const pin = resolveComponentNamedPinOrPin(rawSensor, 'SIG', resolveComponentOrPin(rawSensor, '2'));
    return {
        identifier: getInstanceIdentifier(rawSensor, 'led', pin),
        pin,
    };
}

(micropythonGenerator as any).forBlock['arduino_led_set'] = function (block: Blockly.Block) {
    const state = getMicroPythonState(micropythonGenerator);
    const { identifier, pin } = getMicroPythonLedConfig(block);
    state.imports_.add('machine');
    state.setups_[`led_${identifier}`] = `led_${identifier} = machine.Pin(${pin}, machine.Pin.OUT)`;
    return `led_${identifier}.value(${block.getFieldValue('STATE') === 'HIGH' ? '1' : '0'})\n`;
};
(micropythonGenerator as any).forBlock['arduino_delay'] = function (block: Blockly.Block) {
    const ms = block.getFieldValue('MS');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    return `time.sleep_ms(${ms})\n`;
};

(micropythonGenerator as any).forBlock['time_delay'] = function (block: Blockly.Block) {
    const ms = (micropythonGenerator as any).valueToCode(block, 'MS', (micropythonGenerator as any).ORDER_NONE) || '1000';
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    return `time.sleep_ms(${ms})\n`;
};

(micropythonGenerator as any).forBlock['time_wait_seconds'] = function (block: Blockly.Block) {
    const seconds = (micropythonGenerator as any).valueToCode(block, 'SECONDS', (micropythonGenerator as any).ORDER_NONE) || '1';
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    return `time.sleep(${seconds})\n`;
};

(micropythonGenerator as any).forBlock['time_wait_until'] = function (block: Blockly.Block) {
    const condition = (micropythonGenerator as any).valueToCode(block, 'BOOL', (micropythonGenerator as any).ORDER_NONE) || 'False';
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    return `while not (${condition}):\n    time.sleep_ms(1)\n`;
};

(micropythonGenerator as any).forBlock['arduino_digitalRead'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const state = getMicroPythonState(micropythonGenerator);
    state.imports_.add('machine');
    state.setups_[`pinMode_${pin}`] = `pin_${pin} = machine.Pin(${pin}, machine.Pin.IN)`;
    return [`pin_${pin}.value()`, (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['arduino_analogRead'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const pinNum = pin.replace('A', '');
    const state = getMicroPythonState(micropythonGenerator);
    state.imports_.add('machine');
    state.setups_[`adc_${pin}`] = `adc_${pin} = machine.ADC(machine.Pin(${pinNum}))`;
    return [`adc_${pin}.read()`, (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['arduino_analogWrite'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const value = (micropythonGenerator as any).valueToCode(block, 'VALUE', (micropythonGenerator as any).ORDER_NONE) || '0';
    const state = getMicroPythonState(micropythonGenerator);
    state.imports_.add('machine');
    state.setups_[`pwm_${pin}`] = `pwm_${pin} = machine.PWM(machine.Pin(${pin}))\npwm_${pin}.freq(1000)`;
    // Map standard Arduino 8-bit (0-255) to 10-bit typical micropython mapping
    return `pwm_${pin}.duty(int(${value}) * 4)\n`;
};

(micropythonGenerator as any).forBlock['arduino_tone_pin'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const freq = (micropythonGenerator as any).valueToCode(block, 'FREQ', (micropythonGenerator as any).ORDER_NONE) || '1000';
    const state = getMicroPythonState(micropythonGenerator);
    state.imports_.add('machine');
    state.setups_[`tone_pwm_${pin}`] = `tone_pwm_${pin} = machine.PWM(machine.Pin(${pin}))\ntone_pwm_${pin}.duty_u16(0)`;
    return `tone_pwm_${pin}.freq(int(${freq}))\ntone_pwm_${pin}.duty_u16(32768)\n`;
};

(micropythonGenerator as any).forBlock['arduino_tone_pin_duration'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const freq = (micropythonGenerator as any).valueToCode(block, 'FREQ', (micropythonGenerator as any).ORDER_NONE) || '1000';
    const duration = (micropythonGenerator as any).valueToCode(block, 'DUR', (micropythonGenerator as any).ORDER_NONE) || '250';
    const state = getMicroPythonState(micropythonGenerator);
    state.imports_.add('machine');
    state.imports_.add('time');
    state.setups_[`tone_pwm_${pin}`] = `tone_pwm_${pin} = machine.PWM(machine.Pin(${pin}))\ntone_pwm_${pin}.duty_u16(0)`;
    return `tone_pwm_${pin}.freq(int(${freq}))\ntone_pwm_${pin}.duty_u16(32768)\ntime.sleep_ms(int(${duration}))\ntone_pwm_${pin}.duty_u16(0)\n`;
};

(micropythonGenerator as any).forBlock['arduino_no_tone_pin'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const state = getMicroPythonState(micropythonGenerator);
    state.imports_.add('machine');
    state.setups_[`tone_pwm_${pin}`] = `tone_pwm_${pin} = machine.PWM(machine.Pin(${pin}))\ntone_pwm_${pin}.duty_u16(0)`;
    return `tone_pwm_${pin}.duty_u16(0)\n`;
};
(micropythonGenerator as any).forBlock['arduino_millis'] = function (block: Blockly.Block) {
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    return [`time.ticks_ms()`, (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['arduino_serialPrint'] = function (block: Blockly.Block) {
    const text = (micropythonGenerator as any).valueToCode(block, 'TEXT', (micropythonGenerator as any).ORDER_NONE) || '""';
    return `print(${text}, end="")\n`;
};

(micropythonGenerator as any).forBlock['arduino_serialPrintln'] = function (block: Blockly.Block) {
    const text = (micropythonGenerator as any).valueToCode(block, 'TEXT', (micropythonGenerator as any).ORDER_NONE) || '""';
    return `print(${text})\n`;
};

(micropythonGenerator as any).forBlock['arduino_serialBegin'] = function () {
    return '';
};

(micropythonGenerator as any).forBlock['arduino_hc05_init'] = function (block: Blockly.Block) {
    const rx = block.getFieldValue('RX') || '10';
    const tx = block.getFieldValue('TX') || '11';
    const baud = block.getFieldValue('BAUD') || '9600';
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    (micropythonGenerator as any).setups_['hc05_uart'] = `hc05_uart = machine.UART(1, baudrate=${baud}, tx=machine.Pin(${tx}), rx=machine.Pin(${rx}))`;
    (micropythonGenerator as any).setups_['hc05_reader'] = `def hc05_read_byte():\n    data = hc05_uart.read(1)\n    if not data:\n        return -1\n    return data[0]`;
    return '';
};

(micropythonGenerator as any).forBlock['arduino_hc05_send'] = function (block: Blockly.Block) {
    const text = (micropythonGenerator as any).valueToCode(block, 'TEXT', (micropythonGenerator as any).ORDER_NONE) || '""';
    if (!(micropythonGenerator as any).setups_['hc05_uart']) {
        getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
        (micropythonGenerator as any).setups_['hc05_uart'] = 'hc05_uart = machine.UART(1, baudrate=9600, tx=machine.Pin(11), rx=machine.Pin(10))';
    }
    return `hc05_uart.write(str(${text}) + "\\n")\n`;
};

(micropythonGenerator as any).forBlock['arduino_hc05_available'] = function () {
    if (!(micropythonGenerator as any).setups_['hc05_uart']) {
        getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
        (micropythonGenerator as any).setups_['hc05_uart'] = 'hc05_uart = machine.UART(1, baudrate=9600, tx=machine.Pin(11), rx=machine.Pin(10))';
    }
    return ['hc05_uart.any()', (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['arduino_hc05_read_byte'] = function () {
    if (!(micropythonGenerator as any).setups_['hc05_uart']) {
        getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
        (micropythonGenerator as any).setups_['hc05_uart'] = 'hc05_uart = machine.UART(1, baudrate=9600, tx=machine.Pin(11), rx=machine.Pin(10))';
    }
    if (!(micropythonGenerator as any).setups_['hc05_reader']) {
        (micropythonGenerator as any).setups_['hc05_reader'] = 'def hc05_read_byte():\n    data = hc05_uart.read(1)\n    if not data:\n        return -1\n    return data[0]';
    }
    return ['hc05_read_byte()', (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['arduino_ir_init'] = function () {
    return '# IR receiver blocks are Arduino-only in this phase\n';
};

(micropythonGenerator as any).forBlock['arduino_ir_read_code'] = function () {
    return ['0', (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['arduino_keypad_init'] = function () {
    return '# Keypad blocks are Arduino-only in this phase\n';
};

(micropythonGenerator as any).forBlock['arduino_keypad_get_key'] = function () {
    return ['""', (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['arduino_relay_write'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const state = block.getFieldValue('STATE') === 'HIGH' ? '1' : '0';
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    (micropythonGenerator as any).setups_[`relay_${pin}`] = `relay_${pin} = machine.Pin(${pin}, machine.Pin.OUT)`;
    return `relay_${pin}.value(${state})\n`;
};

(micropythonGenerator as any).forBlock['arduino_buzzer_tone'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const freq = (micropythonGenerator as any).valueToCode(block, 'FREQ', (micropythonGenerator as any).ORDER_NONE) || '1000';
    const duration = (micropythonGenerator as any).valueToCode(block, 'DURATION', (micropythonGenerator as any).ORDER_NONE) || '250';
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    (micropythonGenerator as any).setups_[`buzzer_${pin}`] = `buzzer_${pin} = machine.PWM(machine.Pin(${pin}))`;
    return `buzzer_${pin}.freq(int(${freq}))\nbuzzer_${pin}.duty_u16(32768)\ntime.sleep_ms(int(${duration}))\nbuzzer_${pin}.duty_u16(0)\n`;
};

(micropythonGenerator as any).forBlock['arduino_buzzer_stop'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    (micropythonGenerator as any).setups_[`buzzer_${pin}`] = `buzzer_${pin} = machine.PWM(machine.Pin(${pin}))`;
    return `buzzer_${pin}.duty_u16(0)\n`;
};

(micropythonGenerator as any).forBlock['arduino_pir_read'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    (micropythonGenerator as any).setups_[`pir_${pin}`] = `pir_${pin} = machine.Pin(${pin}, machine.Pin.IN)`;
    return [`pir_${pin}.value()`, (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['arduino_touch_read'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    (micropythonGenerator as any).setups_[`touch_${pin}`] = `touch_${pin} = machine.Pin(${pin}, machine.Pin.IN)`;
    return [`touch_${pin}.value()`, (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['arduino_soil_moisture_read'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const pinNum = String(pin).replace('A', '');
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    (micropythonGenerator as any).setups_[`soil_adc_${pin}`] = `soil_adc_${pin} = machine.ADC(machine.Pin(${pinNum}))`;
    return [`soil_adc_${pin}.read_u16()`, (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['arduino_rain_read'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const pinNum = String(pin).replace('A', '');
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    (micropythonGenerator as any).setups_[`rain_adc_${pin}`] = `rain_adc_${pin} = machine.ADC(machine.Pin(${pinNum}))`;
    return [`rain_adc_${pin}.read_u16()`, (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['arduino_water_level_read'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const pinNum = String(pin).replace('A', '');
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    (micropythonGenerator as any).setups_[`water_adc_${pin}`] = `water_adc_${pin} = machine.ADC(machine.Pin(${pinNum}))`;
    return [`water_adc_${pin}.read_u16()`, (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['arduino_dht_init'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const type = block.getFieldValue('TYPE') || 'DHT11';
    const dhtClass = type === 'DHT22' ? 'DHT22' : 'DHT11';
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    getMicroPythonState(micropythonGenerator).imports_.add('dht');
    (micropythonGenerator as any).setups_[`dht_${pin}`] = `dht_${pin} = dht.${dhtClass}(machine.Pin(${pin}))`;
    return '';
};

(micropythonGenerator as any).forBlock['arduino_dht_read'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const type = block.getFieldValue('TYPE') || 'DHT11';
    const metric = block.getFieldValue('METRIC') || 'TEMP_C';
    const dhtClass = type === 'DHT22' ? 'DHT22' : 'DHT11';
    const helperName = metric === 'HUMIDITY' ? `read_dht_h_${pin}` : `read_dht_t_${pin}`;
    const returnLine = metric === 'HUMIDITY'
        ? `    return dht_${pin}.humidity()`
        : `    return dht_${pin}.temperature()`;

    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    getMicroPythonState(micropythonGenerator).imports_.add('dht');
    (micropythonGenerator as any).setups_[`dht_${pin}`] = `dht_${pin} = dht.${dhtClass}(machine.Pin(${pin}))`;
    (micropythonGenerator as any).setups_[helperName] = `def ${helperName}():\n    dht_${pin}.measure()\n${returnLine}`;
    return [`${helperName}()`, (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['arduino_bme280_init'] = function (block: Blockly.Block) {
    const address = block.getFieldValue('ADDRESS') || '0x76';
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    getMicroPythonState(micropythonGenerator).imports_.add('bme280');
    (micropythonGenerator as any).setups_['bme280_i2c'] = 'i2c_bme280 = machine.I2C(0, scl=machine.Pin(5), sda=machine.Pin(4))';
    (micropythonGenerator as any).setups_['bme280_sensor'] = `bme = bme280.BME280(i2c=i2c_bme280, address=${address})`;
    return '';
};

(micropythonGenerator as any).forBlock['arduino_bme280_read'] = function (block: Blockly.Block) {
    const metric = block.getFieldValue('METRIC') || 'TEMP_C';
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    getMicroPythonState(micropythonGenerator).imports_.add('bme280');
    (micropythonGenerator as any).setups_['bme280_i2c'] = 'i2c_bme280 = machine.I2C(0, scl=machine.Pin(5), sda=machine.Pin(4))';
    (micropythonGenerator as any).setups_['bme280_sensor'] = 'bme = bme280.BME280(i2c=i2c_bme280, address=0x76)';

    if (metric === 'HUMIDITY') {
        return ['(float(bme.values[2].replace("%", "")))', (micropythonGenerator as any).ORDER_ATOMIC];
    }
    if (metric === 'PRESSURE_HPA') {
        return ['(float(bme.values[1].replace("hPa", "")))', (micropythonGenerator as any).ORDER_ATOMIC];
    }
    if (metric === 'ALTITUDE_M') {
        return ['0', (micropythonGenerator as any).ORDER_ATOMIC];
    }
    return ['(float(bme.values[0].replace("C", "")))', (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['arduino_bh1750_init'] = function () {
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    getMicroPythonState(micropythonGenerator).imports_.add('bh1750');
    (micropythonGenerator as any).setups_['bh1750_i2c'] = 'i2c_bh1750 = machine.I2C(0, scl=machine.Pin(5), sda=machine.Pin(4))';
    (micropythonGenerator as any).setups_['bh1750_sensor'] = 'light_sensor = bh1750.BH1750(i2c_bh1750)';
    return '';
};

(micropythonGenerator as any).forBlock['arduino_bh1750_read'] = function () {
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    getMicroPythonState(micropythonGenerator).imports_.add('bh1750');
    (micropythonGenerator as any).setups_['bh1750_i2c'] = 'i2c_bh1750 = machine.I2C(0, scl=machine.Pin(5), sda=machine.Pin(4))';
    (micropythonGenerator as any).setups_['bh1750_sensor'] = 'light_sensor = bh1750.BH1750(i2c_bh1750)';
    return ['light_sensor.luminance(bh1750.BH1750.CONT_HIRES_1)', (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['lcd_i2c_init'] = function (block: Blockly.Block) {
    const address = block.getFieldValue('ADDRESS') || '0x27';
    const cols = block.getFieldValue('COLS') || '16';
    const rows = block.getFieldValue('ROWS') || '2';
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    getMicroPythonState(micropythonGenerator).imports_.add('pico_i2c_lcd');
    (micropythonGenerator as any).setups_['lcd_i2c_bus'] = 'i2c_lcd = machine.I2C(0, scl=machine.Pin(5), sda=machine.Pin(4), freq=400000)';
    (micropythonGenerator as any).setups_['lcd_device'] = `lcd = I2cLcd(i2c_lcd, ${address}, ${rows}, ${cols})`;
    return '';
};

(micropythonGenerator as any).forBlock['lcd_i2c_clear'] = function () {
    if (!(micropythonGenerator as any).setups_['lcd_device']) {
        getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
        getMicroPythonState(micropythonGenerator).imports_.add('pico_i2c_lcd');
        (micropythonGenerator as any).setups_['lcd_i2c_bus'] = 'i2c_lcd = machine.I2C(0, scl=machine.Pin(5), sda=machine.Pin(4), freq=400000)';
        (micropythonGenerator as any).setups_['lcd_device'] = 'lcd = I2cLcd(i2c_lcd, 0x27, 2, 16)';
    }
    return 'lcd.clear()\n';
};

(micropythonGenerator as any).forBlock['lcd_i2c_print'] = function (block: Blockly.Block) {
    const text = (micropythonGenerator as any).valueToCode(block, 'TEXT', (micropythonGenerator as any).ORDER_NONE) || '""';
    const col = (micropythonGenerator as any).valueToCode(block, 'COL', (micropythonGenerator as any).ORDER_NONE) || '0';
    const row = (micropythonGenerator as any).valueToCode(block, 'ROW', (micropythonGenerator as any).ORDER_NONE) || '0';
    if (!(micropythonGenerator as any).setups_['lcd_device']) {
        getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
        getMicroPythonState(micropythonGenerator).imports_.add('pico_i2c_lcd');
        (micropythonGenerator as any).setups_['lcd_i2c_bus'] = 'i2c_lcd = machine.I2C(0, scl=machine.Pin(5), sda=machine.Pin(4), freq=400000)';
        (micropythonGenerator as any).setups_['lcd_device'] = 'lcd = I2cLcd(i2c_lcd, 0x27, 2, 16)';
    }
    return `lcd.move_to(int(${col}), int(${row}))\nlcd.putstr(str(${text}))\n`;
};

(micropythonGenerator as any).forBlock['arduino_l298n_drive'] = function (block: Blockly.Block) {
    const en = block.getFieldValue('EN');
    const in1 = block.getFieldValue('IN1');
    const in2 = block.getFieldValue('IN2');
    const dir = block.getFieldValue('DIR') || 'STOP';
    const speed = (micropythonGenerator as any).valueToCode(block, 'SPEED', (micropythonGenerator as any).ORDER_NONE) || '0';
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');

    if (dir === 'FORWARD') {
        return `pwm_${en} = machine.PWM(machine.Pin(${en}))\npwm_${en}.freq(1000)\npwm_${en}.duty(int(${speed}) * 4)\nmachine.Pin(${in1}, machine.Pin.OUT).value(1)\nmachine.Pin(${in2}, machine.Pin.OUT).value(0)\n`;
    }
    if (dir === 'REVERSE') {
        return `pwm_${en} = machine.PWM(machine.Pin(${en}))\npwm_${en}.freq(1000)\npwm_${en}.duty(int(${speed}) * 4)\nmachine.Pin(${in1}, machine.Pin.OUT).value(0)\nmachine.Pin(${in2}, machine.Pin.OUT).value(1)\n`;
    }
    if (dir === 'BRAKE') {
        return `pwm_${en} = machine.PWM(machine.Pin(${en}))\npwm_${en}.freq(1000)\npwm_${en}.duty(int(${speed}) * 4)\nmachine.Pin(${in1}, machine.Pin.OUT).value(1)\nmachine.Pin(${in2}, machine.Pin.OUT).value(1)\n`;
    }
    return `machine.Pin(${in1}, machine.Pin.OUT).value(0)\nmachine.Pin(${in2}, machine.Pin.OUT).value(0)\n`;
};
(micropythonGenerator as any).forBlock['arduino_servo_write'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const angle = (micropythonGenerator as any).valueToCode(block, 'ANGLE', (micropythonGenerator as any).ORDER_NONE) || '90';
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    (micropythonGenerator as any).setups_[`servo_pwm_${pin}`] = `servo_${pin} = machine.PWM(machine.Pin(${pin}), freq=50)`;
    return `servo_${pin}.duty(int((${angle} / 180) * 75 + 40))\n`;
};

(micropythonGenerator as any).forBlock['arduino_ultrasonic'] = function (block: Blockly.Block) {
    const trig = block.getFieldValue('TRIG');
    const echo = block.getFieldValue('ECHO');
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    (micropythonGenerator as any).setups_['ultrasonic_func'] = `def read_ultrasonic(trig_pin, echo_pin):\n    trig = machine.Pin(trig_pin, machine.Pin.OUT)\n    echo = machine.Pin(echo_pin, machine.Pin.IN)\n    trig.value(0)\n    time.sleep_us(2)\n    trig.value(1)\n    time.sleep_us(10)\n    trig.value(0)\n    try:\n        return machine.time_pulse_us(echo, 1, 30000) * 0.017\n    except:\n        return -1`;
    return [`read_ultrasonic(${trig}, ${echo})`, (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['arduino_setup_loop'] = function (block: Blockly.Block) {
    const setupCode = (micropythonGenerator as any).statementToCode(block, 'SETUP') || '';
    const loopCode = (micropythonGenerator as any).statementToCode(block, 'LOOP') || '';
    (micropythonGenerator as any).setups_['__setup_code__'] = dedentMicroPython(setupCode).trimEnd();
    (micropythonGenerator as any).setups_['__loop_code__'] = dedentMicroPython(loopCode).trimEnd();
    return '';
};

(micropythonGenerator as any).forBlock['arduino_on_start'] = function (block: Blockly.Block) {
    const setupCode = dedentMicroPython((micropythonGenerator as any).statementToCode(block, 'SETUP') || '').trimEnd();
    const existing = (micropythonGenerator as any).setups_['__setup_code__'] || '';
    (micropythonGenerator as any).setups_['__setup_code__'] = [existing, setupCode].filter(Boolean).join("\n");
    return '';
};

(micropythonGenerator as any).forBlock['arduino_forever'] = function (block: Blockly.Block) {
    const loopCode = dedentMicroPython((micropythonGenerator as any).statementToCode(block, 'LOOP') || '').trimEnd();
    const existing = (micropythonGenerator as any).setups_['__loop_code__'] || '';
    (micropythonGenerator as any).setups_['__loop_code__'] = [existing, loopCode].filter(Boolean).join("\n");
    return '';
};

(micropythonGenerator as any).forBlock['oled_init'] = function (block: Blockly.Block) {
    const width = block.getFieldValue('WIDTH');
    const height = block.getFieldValue('HEIGHT');
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    getMicroPythonState(micropythonGenerator).imports_.add('ssd1306');
    (micropythonGenerator as any).setups_['init_i2c'] = 'i2c = machine.I2C(0, scl=machine.Pin(5), sda=machine.Pin(4))';
    (micropythonGenerator as any).setups_['init_display'] = `display = ssd1306.SSD1306_I2C(${width}, ${height}, i2c)`;
    return '';
};

(micropythonGenerator as any).forBlock['oled_clear'] = function (block: Blockly.Block) {
    return 'display.fill(0)\ndisplay.show()\n';
};

(micropythonGenerator as any).forBlock['oled_print'] = function (block: Blockly.Block) {
    const x = (micropythonGenerator as any).valueToCode(block, 'X', (micropythonGenerator as any).ORDER_NONE) || '0';
    const y = (micropythonGenerator as any).valueToCode(block, 'Y', (micropythonGenerator as any).ORDER_NONE) || '0';
    const text = (micropythonGenerator as any).valueToCode(block, 'TEXT', (micropythonGenerator as any).ORDER_NONE) || '""';
    return `display.text(str(${text}), int(${x}), int(${y}))\ndisplay.show()\n`;
};

(micropythonGenerator as any).forBlock['neopixel_init'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const count = block.getFieldValue('COUNT');
    getMicroPythonState(micropythonGenerator).imports_.add('neopixel');
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    (micropythonGenerator as any).setups_[`init_np_${pin}`] = `np_${pin} = neopixel.NeoPixel(machine.Pin(${pin}), ${count})`;
    return '';
};

(micropythonGenerator as any).forBlock['neopixel_set_color'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    const index = (micropythonGenerator as any).valueToCode(block, 'INDEX', (micropythonGenerator as any).ORDER_NONE) || '0';
    const r = (micropythonGenerator as any).valueToCode(block, 'R', (micropythonGenerator as any).ORDER_NONE) || '0';
    const g = (micropythonGenerator as any).valueToCode(block, 'G', (micropythonGenerator as any).ORDER_NONE) || '0';
    const b = (micropythonGenerator as any).valueToCode(block, 'B', (micropythonGenerator as any).ORDER_NONE) || '0';
    return `np_${pin}[int(${index})] = (int(${r}), int(${g}), int(${b}))\n`;
};

(micropythonGenerator as any).forBlock['neopixel_show'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    return `np_${pin}.write()\n`;
};

(micropythonGenerator as any).forBlock['neopixel_clear'] = function (block: Blockly.Block) {
    const pin = block.getFieldValue('PIN');
    return `np_${pin}.fill((0, 0, 0))\nnp_${pin}.write()\n`;
};

(micropythonGenerator as any).forBlock['motor_forward'] = function (block: Blockly.Block) {
    const pin1 = block.getFieldValue('PIN1');
    const pin2 = block.getFieldValue('PIN2');
    const speed = (micropythonGenerator as any).valueToCode(block, 'SPEED', (micropythonGenerator as any).ORDER_NONE) || '255';
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    return `machine.PWM(machine.Pin(${pin1})).duty(int(${speed} * 4))\nmachine.Pin(${pin2}, machine.Pin.OUT).value(0)\n`;
};

(micropythonGenerator as any).forBlock['motor_backward'] = function (block: Blockly.Block) {
    const pin1 = block.getFieldValue('PIN1');
    const pin2 = block.getFieldValue('PIN2');
    const speed = (micropythonGenerator as any).valueToCode(block, 'SPEED', (micropythonGenerator as any).ORDER_NONE) || '255';
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    return `machine.Pin(${pin1}, machine.Pin.OUT).value(0)\nmachine.PWM(machine.Pin(${pin2})).duty(int(${speed} * 4))\n`;
};

(micropythonGenerator as any).forBlock['motor_stop'] = function (block: Blockly.Block) {
    const pin1 = block.getFieldValue('PIN1');
    const pin2 = block.getFieldValue('PIN2');
    getMicroPythonState(micropythonGenerator).imports_.add('machine');
    getMicroPythonState(micropythonGenerator).imports_.add('time');
    return `machine.Pin(${pin1}, machine.Pin.OUT).value(0)\nmachine.Pin(${pin2}, machine.Pin.OUT).value(0)\n`;
};

// -- Standard Blocks (Loops, Math, Text) --
(micropythonGenerator as any).ORDER_ATOMIC = 0;
(micropythonGenerator as any).ORDER_NONE = 99;

(micropythonGenerator as any).forBlock['math_number'] = function (block: Blockly.Block) {
    return [block.getFieldValue('NUM'), (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['math_single'] = function (block: Blockly.Block) {
    const operator = block.getFieldValue('OP');
    const arg = (micropythonGenerator as any).valueToCode(block, 'NUM', (micropythonGenerator as any).ORDER_NONE) || '0';
    getMicroPythonState(micropythonGenerator).imports_.add('math');
    let code;
    if (operator === 'ROOT') code = `math.sqrt(${arg})`;
    else if (operator === 'ABS') code = `math.fabs(${arg})`;
    else if (operator === 'NEG') code = `-${arg}`;
    else if (operator === 'LN') code = `math.log(${arg})`;
    else if (operator === 'LOG10') code = `math.log10(${arg})`;
    else if (operator === 'EXP') code = `math.exp(${arg})`;
    else if (operator === 'POW10') code = `math.pow(10, ${arg})`;
    else code = `(${arg})`;
    return [code, (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['math_arithmetic'] = function (block: Blockly.Block) {
    const operator = block.getFieldValue('OP');
    const argument0 = (micropythonGenerator as any).valueToCode(block, 'A', (micropythonGenerator as any).ORDER_NONE) || '0';
    const argument1 = (micropythonGenerator as any).valueToCode(block, 'B', (micropythonGenerator as any).ORDER_NONE) || '0';

    if (operator === 'POWER') {
        return [`(${argument0} ** ${argument1})`, (micropythonGenerator as any).ORDER_ATOMIC];
    }

    const operatorMap: Record<string, string> = {
        ADD: '+',
        MINUS: '-',
        MULTIPLY: '*',
        DIVIDE: '/'
    };
    const op = operatorMap[operator] || '+';
    return [`(${argument0} ${op} ${argument1})`, (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['logic_boolean'] = function (block: Blockly.Block) {
    return [block.getFieldValue('BOOL') === 'TRUE' ? 'True' : 'False', (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['logic_compare'] = function (block: Blockly.Block) {
    const operator = block.getFieldValue('OP');
    const argument0 = (micropythonGenerator as any).valueToCode(block, 'A', (micropythonGenerator as any).ORDER_NONE) || '0';
    const argument1 = (micropythonGenerator as any).valueToCode(block, 'B', (micropythonGenerator as any).ORDER_NONE) || '0';
    const operatorMap: Record<string, string> = {
        EQ: '==',
        NEQ: '!=',
        LT: '<',
        LTE: '<=',
        GT: '>',
        GTE: '>='
    };
    const op = operatorMap[operator] || '==';
    return [`(${argument0} ${op} ${argument1})`, (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['logic_operation'] = function (block: Blockly.Block) {
    const operator = block.getFieldValue('OP');
    const argument0 = (micropythonGenerator as any).valueToCode(block, 'A', (micropythonGenerator as any).ORDER_NONE) || 'False';
    const argument1 = (micropythonGenerator as any).valueToCode(block, 'B', (micropythonGenerator as any).ORDER_NONE) || 'False';
    const op = operator === 'AND' ? 'and' : 'or';
    return [`(${argument0} ${op} ${argument1})`, (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['logic_negate'] = function (block: Blockly.Block) {
    const argument0 = (micropythonGenerator as any).valueToCode(block, 'BOOL', (micropythonGenerator as any).ORDER_NONE) || 'False';
    return [`(not (${argument0}))`, (micropythonGenerator as any).ORDER_ATOMIC];
};

(micropythonGenerator as any).forBlock['controls_if'] = function (block: Blockly.Block) {
    let n = 0;
    let code = '';

    do {
        const condition = (micropythonGenerator as any).valueToCode(block, `IF${n}`, (micropythonGenerator as any).ORDER_NONE) || 'False';
        const branch = (micropythonGenerator as any).statementToCode(block, `DO${n}`) || '    pass\n';
        code += n === 0
            ? `if ${condition}:\n${branch}`
            : `elif ${condition}:\n${branch}`;
        n++;
    } while (block.getInput(`IF${n}`));

    if (block.getInput('ELSE')) {
        const elseBranch = (micropythonGenerator as any).statementToCode(block, 'ELSE') || '    pass\n';
        code += `else:\n${elseBranch}`;
    }

    return code;
};

(micropythonGenerator as any).forBlock['text_print'] = function (block: Blockly.Block) {
    const text = (micropythonGenerator as any).valueToCode(block, 'TEXT', (micropythonGenerator as any).ORDER_NONE) || '""';
    return `print(${text})\n`;
};

(micropythonGenerator as any).forBlock['controls_whileUntil'] = function (block: Blockly.Block) {
    const until = block.getFieldValue('MODE') === 'UNTIL';
    const argument0 = (micropythonGenerator as any).valueToCode(block, 'BOOL', (micropythonGenerator as any).ORDER_NONE) || 'False';
    const branch = (micropythonGenerator as any).statementToCode(block, 'DO') || '    pass\n';
    if (until) {
        return `while not (${argument0}):\n${branch}`;
    }
    return `while ${argument0}:\n${branch}`;
};

(micropythonGenerator as any).forBlock['controls_repeat_ext'] = function (block: Blockly.Block) {
    const repeats = (micropythonGenerator as any).valueToCode(block, 'TIMES', (micropythonGenerator as any).ORDER_NONE) || '0';
    const branch = (micropythonGenerator as any).statementToCode(block, 'DO') || '    pass\n';
    return `for count in range(${repeats}):\n${branch}`;
};

(micropythonGenerator as any).forBlock['text'] = function (block: Blockly.Block) {
    return ['"' + block.getFieldValue('TEXT') + '"', (micropythonGenerator as any).ORDER_ATOMIC];
};

type BlockHandler = (block: Blockly.Block) => string | [string, number] | '';

type GeneratorWithBlocks = Blockly.CodeGenerator & {
    forBlock: Record<string, BlockHandler>;
    ORDER_NONE: number;
    ORDER_ATOMIC: number;
    valueToCode: (block: Blockly.Block, name: string, order: number) => string;
};

function registerOverrideHandlers(generator: GeneratorWithBlocks, handlers: Record<string, BlockHandler>) {
    for (const [type, handler] of Object.entries(handlers)) {
        generator.forBlock[type] = handler;
    }
}

function getValueCode(generator: GeneratorWithBlocks, block: Blockly.Block, name: string, fallback: string) {
    return generator.valueToCode(block, name, generator.ORDER_NONE) || fallback;
}

function findCreatorBlock(
    block: Blockly.Block,
    creatorTypes: string | string[],
    identityField: string,
    identityValue: string
) {
    if (!identityValue || !block.workspace) return null;
    const types = Array.isArray(creatorTypes) ? creatorTypes : [creatorTypes];
    return block.workspace
        .getAllBlocks(false)
        .find((candidate) => types.includes(candidate.type) && candidate.getFieldValue(identityField) === identityValue) || null;
}

function getCreatorFieldValue(
    block: Blockly.Block,
    creatorTypes: string | string[],
    identityField: string,
    identityValue: string,
    targetField: string,
    fallback: string
) {
    const creator = findCreatorBlock(block, creatorTypes, identityField, identityValue);
    const value = creator?.getFieldValue(targetField);
    return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function ensureArduinoServoSetup(identifier: string, pin: string) {
    const setups = (arduinoGenerator as any).setups_;
    setups['include_servo'] = '#include <Servo.h>';
    setups[`declare_servo_${identifier}`] = `Servo ${identifier};`;
    setups[`servo_attach_${identifier}`] = `  ${identifier}.attach(${pin});`;
}

function getArduinoServoConfig(block: Blockly.Block, mode: 'generic' | 'named') {
    if (mode === 'named') {
        const rawName = block.getFieldValue('NAME') || 'myServo';
        return {
            identifier: sanitizeIdentifier(rawName, 'servo'),
            pin: getCreatorFieldValue(block, 'arduino_servo_attach', 'NAME', rawName, 'PIN', '9'),
        };
    }

    const rawSensor = block.getFieldValue('SENSOR') || block.getFieldValue('PIN') || '9';
    const configuredPin = block.type === 'arduino_servo_init'
        ? (block.getFieldValue('PIN') || '9')
        : getCreatorFieldValue(block, 'arduino_servo_init', 'SENSOR', rawSensor, 'PIN', '9');
    const pin = block.type === 'arduino_servo_init'
        ? configuredPin
        : resolveComponentOrPin(rawSensor, configuredPin);

    return {
        identifier: getInstanceIdentifier(rawSensor, 'servo', pin),
        pin,
    };
}

function ensureArduinoUltrasonicSetup(identifier: string, trig: string, echo: string) {
    const setups = (arduinoGenerator as any).setups_;
    setups[`declare_ultrasonic_${identifier}`] = `const int ${identifier}_trig = ${trig};\nconst int ${identifier}_echo = ${echo};`;
    setups[`helper_ultrasonic_${identifier}`] = `long ${identifier}_read_cm() {\n  pinMode(${identifier}_trig, OUTPUT);\n  digitalWrite(${identifier}_trig, LOW);\n  delayMicroseconds(2);\n  digitalWrite(${identifier}_trig, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(${identifier}_trig, LOW);\n  pinMode(${identifier}_echo, INPUT);\n  return pulseIn(${identifier}_echo, HIGH) * 0.01723;\n}`;
}

function getArduinoUltrasonicConfig(block: Blockly.Block, mode: 'generic' | 'named') {
    if (mode === 'named') {
        const rawName = block.getFieldValue('NAME') || 'mySonar';
        return {
            identifier: sanitizeIdentifier(rawName, 'sonar'),
            trig: getCreatorFieldValue(block, 'arduino_sonar_add', 'NAME', rawName, 'TRIG', '9'),
            echo: getCreatorFieldValue(block, 'arduino_sonar_add', 'NAME', rawName, 'ECHO', '10'),
        };
    }

    const rawSensor = block.getFieldValue('SENSOR') || 'ultrasonic';
    const fallbackTrig = block.type === 'arduino_ultrasonic_init'
        ? (block.getFieldValue('TRIG') || '9')
        : getCreatorFieldValue(block, 'arduino_ultrasonic_init', 'SENSOR', rawSensor, 'TRIG', '9');
    const fallbackEcho = block.type === 'arduino_ultrasonic_init'
        ? (block.getFieldValue('ECHO') || '10')
        : getCreatorFieldValue(block, 'arduino_ultrasonic_init', 'SENSOR', rawSensor, 'ECHO', '10');

    return {
        identifier: getInstanceIdentifier(rawSensor, 'ultrasonic', fallbackTrig),
        trig: resolveComponentNamedPinOrPin(rawSensor, 'TRIG', fallbackTrig),
        echo: resolveComponentNamedPinOrPin(rawSensor, 'ECHO', fallbackEcho),
    };
}

function ensureArduinoDhtSetup(identifier: string, pin: string, type: string) {
    const setups = (arduinoGenerator as any).setups_;
    setups['include_dht'] = '#include <DHT.h>';
    setups[`declare_dht_${identifier}`] = `DHT ${identifier}(${pin}, ${type});`;
    setups[`dht_begin_${identifier}`] = `  ${identifier}.begin();`;
}

function getArduinoDhtConfig(block: Blockly.Block, mode: 'generic' | 'named') {
    if (mode === 'named') {
        const rawName = block.getFieldValue('NAME') || 'myDHT';
        return {
            identifier: sanitizeIdentifier(rawName, 'dht'),
            pin: getCreatorFieldValue(block, 'arduino_dht_named_add', 'NAME', rawName, 'PIN', '2'),
            type: getCreatorFieldValue(block, 'arduino_dht_named_add', 'NAME', rawName, 'TYPE', 'DHT11'),
        };
    }

    const rawSensor = block.getFieldValue('SENSOR') || 'dht';
    const type = block.getFieldValue('TYPE') || getCreatorFieldValue(block, 'arduino_dht_init', 'SENSOR', rawSensor, 'TYPE', 'DHT11');
    const fallbackPin = block.type === 'arduino_dht_init'
        ? (block.getFieldValue('PIN') || '2')
        : getCreatorFieldValue(block, 'arduino_dht_init', 'SENSOR', rawSensor, 'PIN', '2');

    return {
        identifier: getInstanceIdentifier(rawSensor, 'dht', fallbackPin),
        pin: resolveComponentOrPin(rawSensor, fallbackPin),
        type,
    };
}

registerOverrideHandlers(arduinoGenerator as GeneratorWithBlocks, {
    arduino_servo_init(block: Blockly.Block) {
        const { identifier, pin } = getArduinoServoConfig(block, 'generic');
        ensureArduinoServoSetup(identifier, pin);
        return '';
    },
    arduino_servo_write(block: Blockly.Block) {
        const { identifier, pin } = getArduinoServoConfig(block, 'generic');
        const angle = getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'ANGLE', '90');
        ensureArduinoServoSetup(identifier, pin);
        return `  ${identifier}.write(${angle});\n`;
    },
    arduino_servo_read(block: Blockly.Block) {
        const { identifier, pin } = getArduinoServoConfig(block, 'generic');
        ensureArduinoServoSetup(identifier, pin);
        return [`${identifier}.read()`, (arduinoGenerator as any).ORDER_ATOMIC];
    },
    arduino_servo_attach(block: Blockly.Block) {
        const { identifier, pin } = getArduinoServoConfig(block, 'named');
        ensureArduinoServoSetup(identifier, pin);
        return '';
    },
    arduino_servo_detach(block: Blockly.Block) {
        const { identifier, pin } = getArduinoServoConfig(block, 'named');
        ensureArduinoServoSetup(identifier, pin);
        return `  ${identifier}.detach();\n`;
    },
    arduino_servo_set_angle(block: Blockly.Block) {
        const { identifier, pin } = getArduinoServoConfig(block, 'named');
        const angle = getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'ANGLE', '90');
        ensureArduinoServoSetup(identifier, pin);
        return `  ${identifier}.write(${angle});\n`;
    },
    arduino_servo_read_angle(block: Blockly.Block) {
        const { identifier, pin } = getArduinoServoConfig(block, 'named');
        ensureArduinoServoSetup(identifier, pin);
        return [`${identifier}.read()`, (arduinoGenerator as any).ORDER_ATOMIC];
    },
    arduino_ultrasonic_init(block: Blockly.Block) {
        const { identifier, trig, echo } = getArduinoUltrasonicConfig(block, 'generic');
        ensureArduinoUltrasonicSetup(identifier, trig, echo);
        return '';
    },
    arduino_ultrasonic(block: Blockly.Block) {
        const { identifier, trig, echo } = getArduinoUltrasonicConfig(block, 'generic');
        ensureArduinoUltrasonicSetup(identifier, trig, echo);
        return [`${identifier}_read_cm()`, (arduinoGenerator as any).ORDER_ATOMIC];
    },
    arduino_sonar_add(block: Blockly.Block) {
        const { identifier, trig, echo } = getArduinoUltrasonicConfig(block, 'named');
        ensureArduinoUltrasonicSetup(identifier, trig, echo);
        return '';
    },
    arduino_sonar_read(block: Blockly.Block) {
        const { identifier, trig, echo } = getArduinoUltrasonicConfig(block, 'named');
        const unit = block.getFieldValue('UNIT') || 'CM';
        ensureArduinoUltrasonicSetup(identifier, trig, echo);
        if (unit === 'INCH') return [`(${identifier}_read_cm() / 2.54)`, (arduinoGenerator as any).ORDER_ATOMIC];
        if (unit === 'MM') return [`(${identifier}_read_cm() * 10)`, (arduinoGenerator as any).ORDER_ATOMIC];
        return [`${identifier}_read_cm()`, (arduinoGenerator as any).ORDER_ATOMIC];
    },
    arduino_dht_init(block: Blockly.Block) {
        const { identifier, pin, type } = getArduinoDhtConfig(block, 'generic');
        ensureArduinoDhtSetup(identifier, pin, type);
        return '';
    },
    arduino_dht_read(block: Blockly.Block) {
        const { identifier, pin, type } = getArduinoDhtConfig(block, 'generic');
        const metric = block.getFieldValue('METRIC') || 'TEMP_C';
        ensureArduinoDhtSetup(identifier, pin, type);
        return [metric === 'HUMIDITY' ? `${identifier}.readHumidity()` : `${identifier}.readTemperature()`, (arduinoGenerator as any).ORDER_ATOMIC];
    },
    arduino_dht_named_add(block: Blockly.Block) {
        const { identifier, pin, type } = getArduinoDhtConfig(block, 'named');
        ensureArduinoDhtSetup(identifier, pin, type);
        return '';
    },
    arduino_dht_named_temp(block: Blockly.Block) {
        const { identifier, pin, type } = getArduinoDhtConfig(block, 'named');
        ensureArduinoDhtSetup(identifier, pin, type);
        return [`${identifier}.readTemperature()`, (arduinoGenerator as any).ORDER_ATOMIC];
    },
    arduino_dht_named_humidity(block: Blockly.Block) {
        const { identifier, pin, type } = getArduinoDhtConfig(block, 'named');
        ensureArduinoDhtSetup(identifier, pin, type);
        return [`${identifier}.readHumidity()`, (arduinoGenerator as any).ORDER_ATOMIC];
    },
    arduino_dht_named_temp_f(block: Blockly.Block) {
        const { identifier, pin, type } = getArduinoDhtConfig(block, 'named');
        ensureArduinoDhtSetup(identifier, pin, type);
        return [`${identifier}.readTemperature(true)`, (arduinoGenerator as any).ORDER_ATOMIC];
    },
});
function ensureArduinoEncoderSetup(identifier: string, clk: string, dt: string) {
    const setups = (arduinoGenerator as any).setups_;
    setups['include_encoder'] = '#include <Encoder.h>';
    setups[`declare_encoder_${identifier}`] = `Encoder ${identifier}(${clk}, ${dt});`;
}

function getArduinoEncoderConfig(block: Blockly.Block, mode: 'generic' | 'named') {
    if (mode === 'named') {
        const rawName = block.getFieldValue('NAME') || 'myEncoder';
        return {
            identifier: sanitizeIdentifier(rawName, 'encoder'),
            clk: getCreatorFieldValue(block, 'arduino_encoder_add', 'NAME', rawName, 'CLK', '2'),
            dt: getCreatorFieldValue(block, 'arduino_encoder_add', 'NAME', rawName, 'DT', '3'),
        };
    }

    const rawSensor = block.getFieldValue('SENSOR') || 'encoder_1';
    return {
        identifier: sanitizeIdentifier(rawSensor, 'encoder'),
        clk: getCreatorFieldValue(block, 'arduino_encoder_init', 'SENSOR', rawSensor, 'CLK', '2'),
        dt: getCreatorFieldValue(block, 'arduino_encoder_init', 'SENSOR', rawSensor, 'DT', '3'),
    };
}

function ensureArduinoStepperSetup(identifier: string, stepsPerRevolution: string, pins: string[]) {
    const setups = (arduinoGenerator as any).setups_;
    setups['include_stepper'] = '#include <Stepper.h>';
    setups[`declare_stepper_${identifier}`] = `Stepper ${identifier}(${stepsPerRevolution}, ${pins.join(', ')});`;
    setups[`stepper_speed_${identifier}`] = `  ${identifier}.setSpeed(60);`;
}

function getArduinoStepperConfig(block: Blockly.Block, mode: 'generic' | 'named') {
    if (mode === 'named') {
        const rawName = block.getFieldValue('NAME') || 'myStepper';
        const creator = findCreatorBlock(block, ['arduino_stepper_add_2wire', 'arduino_stepper_add_4wire'], 'NAME', rawName);
        const stepsPerRevolution = creator ? getValueCode(arduinoGenerator as GeneratorWithBlocks, creator, 'STEPS', '200') : '200';
        const pin1 = creator?.getFieldValue('PIN1') || '8';
        const pin2 = creator?.getFieldValue('PIN2') || '9';
        const pin3 = creator?.getFieldValue('PIN3') || '';
        const pin4 = creator?.getFieldValue('PIN4') || '';
        const pins = pin3 && pin4 ? [pin1, pin2, pin3, pin4] : [pin1, pin2];
        return { identifier: sanitizeIdentifier(rawName, 'stepper'), stepsPerRevolution, pins };
    }

    const rawSensor = block.getFieldValue('SENSOR') || 'stepper_1';
    const creator = findCreatorBlock(block, 'arduino_stepper_init', 'SENSOR', rawSensor);
    return {
        identifier: sanitizeIdentifier(rawSensor, 'stepper'),
        stepsPerRevolution: creator?.getFieldValue('STEPS') || '200',
        pins: [creator?.getFieldValue('PIN1') || '8', creator?.getFieldValue('PIN2') || '9'],
    };
}

function ensureArduinoL298nSetup(identifier: string, config: { ena: string; enb: string; in1: string; in2: string; in3: string; in4: string }) {
    const setups = (arduinoGenerator as any).setups_;
    setups[`declare_l298n_${identifier}`] = `const int ${identifier}_ena = ${config.ena};\nconst int ${identifier}_enb = ${config.enb};\nconst int ${identifier}_in1 = ${config.in1};\nconst int ${identifier}_in2 = ${config.in2};\nconst int ${identifier}_in3 = ${config.in3};\nconst int ${identifier}_in4 = ${config.in4};`;
    setups[`l298_pinmode_ena_${identifier}`] = `  pinMode(${identifier}_ena, OUTPUT);`;
    setups[`l298_pinmode_enb_${identifier}`] = `  pinMode(${identifier}_enb, OUTPUT);`;
    setups[`l298_pinmode_in1_${identifier}`] = `  pinMode(${identifier}_in1, OUTPUT);`;
    setups[`l298_pinmode_in2_${identifier}`] = `  pinMode(${identifier}_in2, OUTPUT);`;
    setups[`l298_pinmode_in3_${identifier}`] = `  pinMode(${identifier}_in3, OUTPUT);`;
    setups[`l298_pinmode_in4_${identifier}`] = `  pinMode(${identifier}_in4, OUTPUT);`;
}

function getArduinoL298nConfig(block: Blockly.Block, mode: 'generic' | 'named') {
    if (mode === 'named') {
        const rawName = block.getFieldValue('NAME') || 'myL298N';
        return {
            identifier: sanitizeIdentifier(rawName, 'l298n'),
            ena: getCreatorFieldValue(block, 'arduino_l298n_attach', 'NAME', rawName, 'ENA', '5'),
            enb: getCreatorFieldValue(block, 'arduino_l298n_attach', 'NAME', rawName, 'ENB', '6'),
            in1: getCreatorFieldValue(block, 'arduino_l298n_attach', 'NAME', rawName, 'IN1', '7'),
            in2: getCreatorFieldValue(block, 'arduino_l298n_attach', 'NAME', rawName, 'IN2', '8'),
            in3: getCreatorFieldValue(block, 'arduino_l298n_attach', 'NAME', rawName, 'IN3', '9'),
            in4: getCreatorFieldValue(block, 'arduino_l298n_attach', 'NAME', rawName, 'IN4', '10'),
        };
    }

    const rawSensor = block.getFieldValue('SENSOR') || 'l298n_1';
    return {
        identifier: sanitizeIdentifier(rawSensor, 'l298n'),
        ena: getCreatorFieldValue(block, 'arduino_l298n_init', 'SENSOR', rawSensor, 'ENA', '5'),
        enb: getCreatorFieldValue(block, 'arduino_l298n_init', 'SENSOR', rawSensor, 'ENB', '6'),
        in1: getCreatorFieldValue(block, 'arduino_l298n_init', 'SENSOR', rawSensor, 'IN1', '7'),
        in2: getCreatorFieldValue(block, 'arduino_l298n_init', 'SENSOR', rawSensor, 'IN2', '8'),
        in3: getCreatorFieldValue(block, 'arduino_l298n_init', 'SENSOR', rawSensor, 'IN3', '9'),
        in4: getCreatorFieldValue(block, 'arduino_l298n_init', 'SENSOR', rawSensor, 'IN4', '10'),
    };
}

function arduinoL298nDirectionStatement(identifier: string, motor: string, direction: string) {
    const enablePin = motor === 'B' ? `${identifier}_enb` : `${identifier}_ena`;
    const inA = motor === 'B' ? `${identifier}_in3` : `${identifier}_in1`;
    const inB = motor === 'B' ? `${identifier}_in4` : `${identifier}_in2`;

    if (direction === 'FORWARD') return `  analogWrite(${enablePin}, 255);\n  digitalWrite(${inA}, HIGH);\n  digitalWrite(${inB}, LOW);\n`;
    if (direction === 'REVERSE' || direction === 'BACKWARD') return `  analogWrite(${enablePin}, 255);\n  digitalWrite(${inA}, LOW);\n  digitalWrite(${inB}, HIGH);\n`;
    if (direction === 'BRAKE') return `  analogWrite(${enablePin}, 255);\n  digitalWrite(${inA}, HIGH);\n  digitalWrite(${inB}, HIGH);\n`;
    return `  analogWrite(${enablePin}, 0);\n  digitalWrite(${inA}, LOW);\n  digitalWrite(${inB}, LOW);\n`;
}

registerOverrideHandlers(arduinoGenerator as GeneratorWithBlocks, {
    arduino_encoder_init(block: Blockly.Block) {
        const { identifier, clk, dt } = getArduinoEncoderConfig(block, 'generic');
        ensureArduinoEncoderSetup(identifier, clk, dt);
        return '';
    },
    arduino_encoder_read(block: Blockly.Block) {
        const { identifier, clk, dt } = getArduinoEncoderConfig(block, 'generic');
        ensureArduinoEncoderSetup(identifier, clk, dt);
        return [`${identifier}.read()`, (arduinoGenerator as any).ORDER_ATOMIC];
    },
    arduino_encoder_write(block: Blockly.Block) {
        const { identifier, clk, dt } = getArduinoEncoderConfig(block, 'generic');
        const value = getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'VALUE', '0');
        ensureArduinoEncoderSetup(identifier, clk, dt);
        return `  ${identifier}.write(${value});\n`;
    },
    arduino_encoder_add(block: Blockly.Block) {
        const { identifier, clk, dt } = getArduinoEncoderConfig(block, 'named');
        ensureArduinoEncoderSetup(identifier, clk, dt);
        return '';
    },
    arduino_encoder_named_read(block: Blockly.Block) {
        const { identifier, clk, dt } = getArduinoEncoderConfig(block, 'named');
        ensureArduinoEncoderSetup(identifier, clk, dt);
        return [`${identifier}.read()`, (arduinoGenerator as any).ORDER_ATOMIC];
    },
    arduino_encoder_reset(block: Blockly.Block) {
        const { identifier, clk, dt } = getArduinoEncoderConfig(block, 'named');
        ensureArduinoEncoderSetup(identifier, clk, dt);
        return `  ${identifier}.write(0);\n`;
    },
    arduino_stepper_init(block: Blockly.Block) {
        const { identifier, stepsPerRevolution, pins } = getArduinoStepperConfig(block, 'generic');
        ensureArduinoStepperSetup(identifier, stepsPerRevolution, pins);
        return '';
    },
    arduino_stepper_speed(block: Blockly.Block) {
        const { identifier, stepsPerRevolution, pins } = getArduinoStepperConfig(block, 'generic');
        const rpm = block.getFieldValue('RPM') || '60';
        ensureArduinoStepperSetup(identifier, stepsPerRevolution, pins);
        return `  ${identifier}.setSpeed(${rpm});\n`;
    },
    arduino_stepper_step(block: Blockly.Block) {
        const { identifier, stepsPerRevolution, pins } = getArduinoStepperConfig(block, 'generic');
        const steps = getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'STEPS', '200');
        ensureArduinoStepperSetup(identifier, stepsPerRevolution, pins);
        return `  ${identifier}.step(${steps});\n`;
    },
    arduino_stepper_add_2wire(block: Blockly.Block) {
        const { identifier, stepsPerRevolution, pins } = getArduinoStepperConfig(block, 'named');
        ensureArduinoStepperSetup(identifier, stepsPerRevolution, pins);
        return '';
    },
    arduino_stepper_add_4wire(block: Blockly.Block) {
        const { identifier, stepsPerRevolution, pins } = getArduinoStepperConfig(block, 'named');
        ensureArduinoStepperSetup(identifier, stepsPerRevolution, pins);
        return '';
    },
    arduino_stepper_set_speed(block: Blockly.Block) {
        const { identifier, stepsPerRevolution, pins } = getArduinoStepperConfig(block, 'named');
        const rpm = getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'RPM', '60');
        ensureArduinoStepperSetup(identifier, stepsPerRevolution, pins);
        return `  ${identifier}.setSpeed(${rpm});\n`;
    },
    arduino_stepper_step_named(block: Blockly.Block) {
        const { identifier, stepsPerRevolution, pins } = getArduinoStepperConfig(block, 'named');
        const steps = getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'STEPS', '200');
        ensureArduinoStepperSetup(identifier, stepsPerRevolution, pins);
        return `  ${identifier}.step(${steps});\n`;
    },
    arduino_l298n_init(block: Blockly.Block) {
        const config = getArduinoL298nConfig(block, 'generic');
        ensureArduinoL298nSetup(config.identifier, config);
        return '';
    },
    arduino_l298n_drive(block: Blockly.Block) {
        const config = getArduinoL298nConfig(block, 'generic');
        ensureArduinoL298nSetup(config.identifier, config);
        return arduinoL298nDirectionStatement(config.identifier, block.getFieldValue('MOTOR') || 'A', block.getFieldValue('DIR') || 'STOP');
    },
    arduino_l298n_speed(block: Blockly.Block) {
        const config = getArduinoL298nConfig(block, 'generic');
        const enablePin = (block.getFieldValue('MOTOR') || 'A') === 'B' ? `${config.identifier}_enb` : `${config.identifier}_ena`;
        const speed = getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'SPEED', '255');
        ensureArduinoL298nSetup(config.identifier, config);
        return `  analogWrite(${enablePin}, constrain(${speed}, 0, 255));\n`;
    },
    arduino_l298n_attach(block: Blockly.Block) {
        const config = getArduinoL298nConfig(block, 'named');
        ensureArduinoL298nSetup(config.identifier, config);
        return '';
    },
    arduino_l298n_set_direction(block: Blockly.Block) {
        const config = getArduinoL298nConfig(block, 'named');
        ensureArduinoL298nSetup(config.identifier, config);
        return arduinoL298nDirectionStatement(config.identifier, block.getFieldValue('MOTOR') || 'A', block.getFieldValue('DIR') || 'STOP');
    },
    arduino_l298n_set_speed(block: Blockly.Block) {
        const config = getArduinoL298nConfig(block, 'named');
        const enablePin = (block.getFieldValue('MOTOR') || 'A') === 'B' ? `${config.identifier}_enb` : `${config.identifier}_ena`;
        const speed = getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'SPEED', '255');
        ensureArduinoL298nSetup(config.identifier, config);
        return `  analogWrite(${enablePin}, constrain(${speed}, 0, 255));\n`;
    },
});
function getArduinoNeoPixelConfig(block: Blockly.Block) {
    const rawSensor = block.getFieldValue('SENSOR') || 'NONE';
    const creator = findCreatorBlock(block, 'neopixel_init', 'SENSOR', rawSensor);
    return {
        identifier: getInstanceIdentifier(rawSensor, 'neopixel', '6'),
        count: creator?.getFieldValue('COUNT') || block.getFieldValue('COUNT') || '8',
        pin: resolveComponentOrPin(rawSensor, '6'),
    };
}

function ensureArduinoNeoPixelSetup(identifier: string, count: string, pin: string) {
    const setups = (arduinoGenerator as any).setups_;
    setups['include_neopixel'] = '#include <Adafruit_NeoPixel.h>';
    setups[`declare_neopixel_${identifier}`] = `Adafruit_NeoPixel ${identifier}(${count}, ${pin}, NEO_GRB + NEO_KHZ800);`;
    setups[`neopixel_begin_${identifier}`] = `  ${identifier}.begin();`;
    setups[`neopixel_show_${identifier}`] = `  ${identifier}.show();`;
}

function getArduinoOledConfig(block: Blockly.Block) {
    const rawSensor = block.getFieldValue('SENSOR') || 'NONE';
    const creator = findCreatorBlock(block, 'oled_init', 'SENSOR', rawSensor);
    return {
        identifier: getInstanceIdentifier(rawSensor, 'display', 'oled'),
        width: creator?.getFieldValue('WIDTH') || block.getFieldValue('WIDTH') || '128',
        height: creator?.getFieldValue('HEIGHT') || block.getFieldValue('HEIGHT') || '64',
    };
}

function ensureArduinoOledSetup(identifier: string, width: string, height: string) {
    const setups = (arduinoGenerator as any).setups_;
    setups['include_wire'] = '#include <Wire.h>';
    setups['include_adafruit_gfx'] = '#include <Adafruit_GFX.h>';
    setups['include_adafruit_ssd1306'] = '#include <Adafruit_SSD1306.h>';
    setups[`declare_oled_${identifier}`] = `Adafruit_SSD1306 ${identifier}(${width}, ${height}, &Wire, -1);`;
    setups[`oled_begin_${identifier}`] = `  if (!${identifier}.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {\n    for (;;) {}\n  }\n  ${identifier}.clearDisplay();\n  ${identifier}.setTextColor(WHITE);`;
}

function ensureArduinoTftSetup() {
    const setups = (arduinoGenerator as any).setups_;
    setups['include_mcufriend_tft'] = '#include <MCUFRIEND_kbv.h>';
    setups['declare_tft_display'] = 'MCUFRIEND_kbv tft;';
    setups['tft_display_begin'] = '  uint16_t tftId = tft.readID();\n  tft.begin(tftId);\n  tft.setRotation(1);\n  tft.fillScreen(TFT_BLACK);\n  tft.setTextColor(TFT_WHITE);\n  tft.setTextSize(2);';
}

registerOverrideHandlers(arduinoGenerator as GeneratorWithBlocks, {
    neopixel_init(block: Blockly.Block) {
        const { identifier, count, pin } = getArduinoNeoPixelConfig(block);
        ensureArduinoNeoPixelSetup(identifier, count, pin);
        return '';
    },
    neopixel_set_color(block: Blockly.Block) {
        const { identifier, count, pin } = getArduinoNeoPixelConfig(block);
        ensureArduinoNeoPixelSetup(identifier, count, pin);
        return `  ${identifier}.setPixelColor(${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'INDEX', '0')}, ${identifier}.Color(${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'R', '0')}, ${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'G', '0')}, ${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'B', '0')}));\n`;
    },
    neopixel_show(block: Blockly.Block) {
        const { identifier, count, pin } = getArduinoNeoPixelConfig(block);
        ensureArduinoNeoPixelSetup(identifier, count, pin);
        return `  ${identifier}.show();\n`;
    },
    neopixel_clear(block: Blockly.Block) {
        const { identifier, count, pin } = getArduinoNeoPixelConfig(block);
        ensureArduinoNeoPixelSetup(identifier, count, pin);
        return `  ${identifier}.clear();\n  ${identifier}.show();\n`;
    },
    oled_init(block: Blockly.Block) {
        const { identifier, width, height } = getArduinoOledConfig(block);
        ensureArduinoOledSetup(identifier, width, height);
        return '';
    },
    oled_clear(block: Blockly.Block) {
        const { identifier, width, height } = getArduinoOledConfig(block);
        ensureArduinoOledSetup(identifier, width, height);
        return `  ${identifier}.clearDisplay();\n  ${identifier}.display();\n`;
    },
    oled_print(block: Blockly.Block) {
        const { identifier, width, height } = getArduinoOledConfig(block);
        ensureArduinoOledSetup(identifier, width, height);
        return `  ${identifier}.setCursor(${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'X', '0')}, ${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'Y', '0')});\n  ${identifier}.print(${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'TEXT', '""')});\n  ${identifier}.display();\n`;
    },
    oled_set_rotation(block: Blockly.Block) {
        const { identifier, width, height } = getArduinoOledConfig(block);
        ensureArduinoOledSetup(identifier, width, height);
        return `  ${identifier}.setRotation(${block.getFieldValue('ROTATION') || '0'});\n  ${identifier}.display();\n`;
    },
    oled_set_text_color(block: Blockly.Block) {
        const { identifier, width, height } = getArduinoOledConfig(block);
        ensureArduinoOledSetup(identifier, width, height);
        return `  ${identifier}.setTextColor(${block.getFieldValue('COLOR') || 'WHITE'});\n  ${identifier}.display();\n`;
    },
    oled_draw_pixel(block: Blockly.Block) {
        const { identifier, width, height } = getArduinoOledConfig(block);
        ensureArduinoOledSetup(identifier, width, height);
        return `  ${identifier}.drawPixel(${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'X', '0')}, ${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'Y', '0')}, ${block.getFieldValue('COLOR') || 'WHITE'});\n  ${identifier}.display();\n`;
    },
    oled_draw_line(block: Blockly.Block) {
        const { identifier, width, height } = getArduinoOledConfig(block);
        ensureArduinoOledSetup(identifier, width, height);
        return `  ${identifier}.drawLine(${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'X0', '0')}, ${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'Y0', '0')}, ${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'X1', '10')}, ${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'Y1', '10')}, ${block.getFieldValue('COLOR') || 'WHITE'});\n  ${identifier}.display();\n`;
    },
    oled_draw_rect(block: Blockly.Block) {
        const { identifier, width, height } = getArduinoOledConfig(block);
        ensureArduinoOledSetup(identifier, width, height);
        const command = block.getFieldValue('FILL') === 'TRUE' ? 'fillRect' : 'drawRect';
        return `  ${identifier}.${command}(${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'X', '0')}, ${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'Y', '0')}, ${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'W', '10')}, ${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'H', '10')}, ${block.getFieldValue('COLOR') || 'WHITE'});\n  ${identifier}.display();\n`;
    },
    oled_draw_circle(block: Blockly.Block) {
        const { identifier, width, height } = getArduinoOledConfig(block);
        ensureArduinoOledSetup(identifier, width, height);
        const command = block.getFieldValue('FILL') === 'TRUE' ? 'fillCircle' : 'drawCircle';
        return `  ${identifier}.${command}(${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'X', '0')}, ${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'Y', '0')}, ${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'R', '5')}, ${block.getFieldValue('COLOR') || 'WHITE'});\n  ${identifier}.display();\n`;
    },
    oled_draw_triangle(block: Blockly.Block) {
        const { identifier, width, height } = getArduinoOledConfig(block);
        ensureArduinoOledSetup(identifier, width, height);
        const command = block.getFieldValue('FILL') === 'TRUE' ? 'fillTriangle' : 'drawTriangle';
        return `  ${identifier}.${command}(${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'X0', '0')}, ${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'Y0', '10')}, ${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'X1', '10')}, ${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'Y1', '0')}, ${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'X2', '20')}, ${getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'Y2', '10')}, ${block.getFieldValue('COLOR') || 'WHITE'});\n  ${identifier}.display();\n`;
    },
    arduino_tft_init(block: Blockly.Block) {
        void block;
        ensureArduinoTftSetup();
        return '';
    },
    arduino_tft_clear(block: Blockly.Block) {
        ensureArduinoTftSetup();
        const color = block.getFieldValue('COLOR') || 'TFT_BLACK';
        return `  tft.fillScreen(${color});
`;
    },
    arduino_tft_print(block: Blockly.Block) {
        ensureArduinoTftSetup();
        const textValue = getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'TEXT', '""');
        const x = getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'X', '0');
        const y = getValueCode(arduinoGenerator as GeneratorWithBlocks, block, 'Y', '0');
        const size = block.getFieldValue('SIZE') || '2';
        const color = block.getFieldValue('COLOR') || 'TFT_WHITE';
        return `  tft.setCursor(${x}, ${y});
  tft.setTextColor(${color});
  tft.setTextSize(${size});
  tft.print(${textValue});
`;
    },
});
// ----------------------------------------------------------------------------
// 3. GENERATOR HELPERS
// ----------------------------------------------------------------------------
// We no longer export a unified generateCode that returns a single string, 
// because BlockEditor needs the raw setups dictionary from the generator to fill the templates.

export function getGenerator(type: string): Blockly.CodeGenerator {
    if (type === "micropython") return micropythonGenerator;
    return arduinoGenerator;
}
