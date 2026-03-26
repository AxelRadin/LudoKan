#!/usr/bin/env python
"""
Script pour exécuter les tests avec différentes configurations
"""
import os
import sys
import subprocess
import argparse
import re


def parse_pytest_output(output):
    """Parse la sortie de pytest pour extraire les statistiques"""
    stats = {
        'passed': 0,
        'failed': 0,
        'skipped': 0,
        'errors': 0,
        'total': 0
    }
    
    # Chercher la ligne de résumé (ex: "23 passed, 48 skipped, 2 failed in 12.34s")
    summary_pattern = r'(\d+)\s+passed|(\d+)\s+failed|(\d+)\s+skipped|(\d+)\s+error'
    
    for match in re.finditer(summary_pattern, output):
        if match.group(1):  # passed
            stats['passed'] = int(match.group(1))
        elif match.group(2):  # failed
            stats['failed'] = int(match.group(2))
        elif match.group(3):  # skipped
            stats['skipped'] = int(match.group(3))
        elif match.group(4):  # errors
            stats['errors'] = int(match.group(4))
    
    stats['total'] = stats['passed'] + stats['failed'] + stats['skipped'] + stats['errors']
    
    return stats


def run_command(command, description):
    """Exécute une commande et affiche le résultat"""
    print(f"\n{'='*60}")
    print(f"🧪 {description}")
    print(f"{'='*60}")
    
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    
    output = result.stdout + result.stderr
    
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr)
    
    return result.returncode == 0, output


def main():
    parser = argparse.ArgumentParser(description='Exécuter les tests LudoKan')
    parser.add_argument('--unit', action='store_true', help='Exécuter seulement les tests unitaires')
    parser.add_argument('--integration', action='store_true', help='Exécuter seulement les tests d\'intégration')
    parser.add_argument('--celery', action='store_true', help='Exécuter seulement les tests Celery')
    parser.add_argument('--coverage', action='store_true', help='Générer un rapport de couverture')
    parser.add_argument('--verbose', '-v', action='store_true', help='Mode verbeux')
    parser.add_argument('--parallel', '-n', type=int, help='Exécuter les tests en parallèle')
    parser.add_argument('--app', help='Exécuter les tests d\'une app spécifique')
    
    args = parser.parse_args()
    
    # Message d'introduction
    print("\n" + "="*60)
    print("🧪 LUDOKAN - SUITE DE TESTS")
    print("="*60)
    print("\n⚠️  Note: Les tests des modèles non implémentés seront skipped")
    print("📋 Vérifiez le résumé à la fin pour voir le nombre de tests skip\n")
    
    # Configuration de base
    base_command = "python -m pytest"
    
    if args.verbose:
        base_command += " -v"
    
    if args.parallel:
        base_command += f" -n {args.parallel}"
    
    if args.coverage:
        base_command += " --cov=apps --cov-report=html --cov-report=term-missing"
    
    # Filtres de tests
    test_filters = []
    
    if args.unit:
        test_filters.append("-m unit")
    elif args.integration:
        test_filters.append("-m integration")
    elif args.celery:
        test_filters.append("-m celery")
    
    if args.app:
        test_filters.append(f"apps/{args.app}/tests/")
    
    if test_filters:
        base_command += " " + " ".join(test_filters)
    
    # Exécution des tests
    success, output = run_command(base_command, "Exécution des tests")
    
    # Parser les résultats
    stats = parse_pytest_output(output)
    
    # Affichage du résumé final
    print("\n" + "="*60)
    print("📊 RÉSUMÉ DES TESTS")
    print("="*60)
    print(f"✅ Tests réussis : {stats['passed']}")
    print(f"❌ Tests échoués : {stats['failed']}")
    print(f"⚠️  Tests skipped : {stats['skipped']}")
    if stats['errors'] > 0:
        print(f"💥 Erreurs : {stats['errors']}")
    print(f"📈 Total : {stats['total']} tests")
    print("="*60)
    
    if stats['skipped'] > 0:
        print(f"\n💡 {stats['skipped']} test(s) ont été skip (modèles non encore implémentés)")
        print("   Consultez TESTS_STATUS.md pour plus de détails")
    
    if success and stats['failed'] == 0:
        print(f"\n✅ Tous les tests actifs passent!")
        if args.coverage:
            print("📊 Rapport de couverture généré dans htmlcov/index.html")
        sys.exit(0)
    else:
        print(f"\n❌ {stats['failed']} test(s) ont échoué!")
        sys.exit(1)


if __name__ == "__main__":
    main()
