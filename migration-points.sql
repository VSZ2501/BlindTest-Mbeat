-- BlindTest-Mbeat — Points de précision en mode écrit (-1 à 3)
-- À exécuter dans le SQL Editor du projet BlindTest-Mbeat

alter table answers add column points int check (points between -1 and 3);

-- Reprise des anciens verdicts éventuels (parties en cours)
update answers set points = 1 where verdict = 'accepted' and points is null;
update answers set points = -1 where verdict = 'rejected' and points is null;
