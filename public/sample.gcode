; Sample CNC G-code for testing
; Simple square pocket with arc corners
G21 ; mm mode
G90 ; absolute positioning
G17 ; XY plane

; Initialize
M3 S12000 ; Spindle on CW
G0 Z5 ; Rapid to safe height

; Move to start position
G0 X0 Y0
G0 Z2 ; approach height

; Plunge
G1 Z-3 F300

; Cut square
G1 X50 F800
G1 Y50
G1 X0
G1 Y0

; Second pass deeper
G1 Z-6 F300
G1 X50 F800
G1 Y50
G1 X0
G1 Y0

; Arc test - circle
G0 Z2
G0 X80 Y25
G1 Z-3 F300
G2 X80 Y25 I0 J25 F600 ; Full circle

; Diagonal rapid
G0 Z5
G0 X0 Y0

; Retract
G0 Z20
M5 ; Spindle off
M30 ; Program end
