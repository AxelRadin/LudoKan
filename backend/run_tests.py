#!/usr/bin/env python
"""
Script pour exécuter les tests avec différentes configurations
"""
import argparse
import re
import subprocess
import sys


def parse_pytest_output(output):
    """Parse la sortie de pytest pour extraire les statistiques"""
    stats = {"passed": 0, "failed": 0, "skipped": 0, "errors": 0, "total": 0}

    # Chercher la ligne de résumé (ex: "23 passed, 48 skipped, 2 failed in 12.34s")
    summary_pattern = r"(\d+)\s+passed|(\d+)\s+failed|(\d+)\s+skipped|(\d+)\s+error"

    for match in re.finditer(summary_pattern, output):
        if match.group(1):  # passed
            stats["passed"] = int(match.group(1))
        elif match.group(2):  # failed
            stats["failed"] = int(match.group(2))
        elif match.group(3):  # skipped
            stats["skipped"] = int(match.group(3))
        elif match.group(4):  # errors
            stats["errors"] = int(match.group(4))

    stats["total"] = stats["passed"] + stats["failed"] + stats["skipped"] + stats["errors"]

    return stats


def run_command(command, description):
    """Exécute une commande et affiche le résultat"""
    print(f"\n{'='*60}")
    print(f"🧪 {description}")
    print(f"{'='*60}\n")

    # Exécute la commande en capturant la sortie tout en l'affichant
    process = subprocess.Popen(
        command,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    output_lines = []
    for line in process.stdout:
        print(line, end="")
        output_lines.append(line)

    process.wait()
    output = "".join(output_lines)

    return process.returncode == 0, output


def build_base_command(args):
    """Construit la commande pytest de base en fonction des options."""
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

    return base_command


def print_intro():
    """Affiche l'en-tête de la suite de tests."""
    print("\n" + "=" * 60)
    print("🧪 LUDOKAN - SUITE DE TESTS")
    print("=" * 60)
    print("\n⚠️  Note: Les tests des modèles non implémentés seront skipped")
    print("📋 Vérifiez le résumé à la fin pour voir le nombre de tests skip\n")


def print_summary(stats):
    """Affiche le résumé des résultats de tests."""
    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ DES TESTS")
    print("=" * 60)
    print(f"✅ Tests réussis (PASSED) : {stats['passed']}")
    if stats["failed"] > 0:
        print(f"❌ Tests échoués (FAILED) : {stats['failed']} - Assertions non satisfaites")
    else:
        print(f"❌ Tests échoués (FAILED) : {stats['failed']}")

    if stats["errors"] > 0:
        print(f"💥 Erreurs (ERROR)        : {stats['errors']} - Erreurs d'exécution/setup")

    print(f"⚠️  Tests skippés (SKIPPED) : {stats['skipped']}")
    print(f"📈 Total : {stats['total']} tests")
    print("=" * 60)

    if stats["skipped"] > 0:
        print(f"\n💡 {stats['skipped']} test(s) ont été skippés")
        print("   (Fonctionnalités non encore implémentées ou tests Celery désactivés)")


def handle_exit(success, stats, coverage_enabled):
    """Gère la logique de sortie (code retour + messages complémentaires)."""
    if success and stats["failed"] == 0 and stats["errors"] == 0:
        print("\n✅ Tous les tests actifs passent!")
        if coverage_enabled:
            print("📊 Rapport de couverture généré dans htmlcov/index.html")
        sys.exit(0)

        total_issues = stats["failed"] + stats["errors"]
        print(f"\n❌ {total_issues} problème(s) détecté(s):")
        if stats["failed"] > 0:
            print(f"   • {stats['failed']} test(s) FAILED (assertions échouées)")
        if stats["errors"] > 0:
            print(f"   • {stats['errors']} ERROR(s) (problèmes d'exécution/setup)")
        print("\n   📋 Consultez la sortie ci-dessus pour plus de détails")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Exécuter les tests LudoKan")
    parser.add_argument("--unit", action="store_true", help="Exécuter seulement les tests unitaires")
    parser.add_argument(
        "--integration",
        action="store_true",
        help="Exécuter seulement les tests d'intégration",
    )
    parser.add_argument("--celery", action="store_true", help="Exécuter seulement les tests Celery")
    parser.add_argument("--coverage", action="store_true", help="Générer un rapport de couverture")
    parser.add_argument("--verbose", "-v", action="store_true", help="Mode verbeux")
    parser.add_argument("--parallel", "-n", type=int, help="Exécuter les tests en parallèle")
    parser.add_argument("--app", help="Exécuter les tests d'une app spécifique")

    args = parser.parse_args()

    print_intro()
    base_command = build_base_command(args)

    # Exécution des tests
    success, output = run_command(base_command, "Exécution des tests")

    # Parser les résultats
    stats = parse_pytest_output(output)

    # Affichage du résumé final
    print_summary(stats)

    # Gérer le code de retour et les messages finaux
    handle_exit(success, stats, args.coverage)


if __name__ == "__main__":
    main()
