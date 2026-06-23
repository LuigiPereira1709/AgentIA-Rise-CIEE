using Microsoft.VisualStudio.TestTools.UnitTesting;
using WebApp.Api.Services;

namespace WebApp.Api.Tests;

[TestClass]
public class AgentFrameworkValidationTests
{
    [TestMethod]
    [DataRow("84305766574", true)] // Valid mathematical CPF
    [DataRow("11111111111", false)] // Invalid repeating digits
    [DataRow("12345678900", false)] // Invalid checksum
    [DataRow("123", false)] // Too short
    [DataRow("", false)] // Empty
    public void IsValidCpf_TestCases(string cpf, bool expected)
    {
        var result = AgentFrameworkService.IsValidCpf(cpf);
        Assert.AreEqual(expected, result);
    }

    [TestMethod]
    [DataRow("luigi@gmail.com", true)]
    [DataRow("luigi.pereira@domain.co.uk", true)]
    [DataRow("luigi pereira 1001@gmail.com", false)] // Contains spaces
    [DataRow("luigi@gmail", false)] // Missing TLD dot format in rule
    [DataRow("@domain.com", false)] // Missing user part
    [DataRow("", false)]
    public void IsValidEmail_TestCases(string email, bool expected)
    {
        var result = AgentFrameworkService.IsValidEmail(email);
        Assert.AreEqual(expected, result);
    }
}
