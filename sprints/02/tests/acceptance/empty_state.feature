Feature: Üres állapot 

  Scenario: Első megnyitás
    Given nincs rekord
    When megnyitja a főoldalt
    Then lát "Nincs még adatod" üzenetet
    And lát "Új elem hozzáadása" gombot
