import time
import random

def intentar_conexion():
    return random.random() > 0.7 

def ejecutar_sincronizacion_bdp(max_intentos=5):
    
    print("Iniciando sincronización...")
    for i in range(max_intentos):
        if intentar_conexion():
            print("¡Éxito! Datos subidos al Core.")
            return True
        
        # Backoff exponencial: 2^0, 2^1, 2^2...
        espera = 2 ** i
        print(f"Fallo. Reintentando en {espera} segundos...")
        time.sleep(espera)
        
    print("Error final: Datos guardados en SQLite local (HU-01).")
    return False

if __name__ == "__main__":
    ejecutar_sincronizacion_bdp()